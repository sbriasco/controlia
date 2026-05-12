import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { InterpretationService } from '../services/interpretation.service';

export const processInterpretation = async (req: Request, res: Response) => {
  try {
    const { empleadoId, startDate, endDate } = req.body;

    if (!empleadoId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos: empleadoId, startDate, endDate' });
    }

    // Parsear fechas como locales (no como UTC)
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    end.setHours(23, 59, 59, 999); // Asegurar que incluya todo el día de hoy

    // 1. Obtener Empleado y su Horario
    const empleado = await prisma.empleados.findUnique({
      where: { id: Number(empleadoId) },
      include: { horarios: true }
    });

    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar que el empleado sea activo
    if (empleado.estado !== 'activo') {
      return res.json({
        message: 'Empleado no activo, no se procesa interpretación',
        novedadesDetectadas: 0
      });
    }

    const horario = empleado.horarios;

    // 2. Preparar periodo y fecha de ingreso del empleado
    const periodo = startDate.substring(0, 7); // YYYY-MM

    const formatUTCDate = (date: Date): string => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const fechaIngresoEmpleado = empleado.fechaingreso ? new Date(empleado.fechaingreso) : null;
    const fechaIngresoStr = fechaIngresoEmpleado ? formatUTCDate(fechaIngresoEmpleado) : null;

    // 3. Obtener Fichadas del rango
    const fichadas = await prisma.fichadas.findMany({
      where: {
        empleadoid: Number(empleadoId),
        timestamp: { gte: start, lte: end }
      },
      orderBy: { timestamp: 'asc' }
    });

    // 4. Procesar día por día (ignorar días anteriores a fechaIngreso)
    const detectedNovelties = [];

    // Ajustar inicio efectivo si el empleado ingreso despues del rango solicitado
    const effectiveStartStr = fechaIngresoStr && startDate < fechaIngresoStr ? fechaIngresoStr : startDate;
    const effectiveStart = parseLocalDate(effectiveStartStr);

    // Normalizar inicio y fin a UTC para una iteracion segura sin saltos de zona horaria
    const currentIterDate = new Date(Date.UTC(effectiveStart.getFullYear(), effectiveStart.getMonth(), effectiveStart.getDate()));
    const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));

    while (currentIterDate <= endUTC) {
      const dateStr = currentIterDate.toISOString().split('T')[0];
      const dayOfWeek = currentIterDate.getUTCDay();
      // Si el empleado ingresó despues de la fecha que estamos evaluando, ignorar.
      if (fechaIngresoStr && dateStr < fechaIngresoStr) {
        currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
        continue;
      }

      const dayMap: Record<string, number> = {
        'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6
      };

      const laborableDays = horario.diassemana.toLowerCase().split(',').map((d: string) => dayMap[d.trim()]);
      const isLaborable = laborableDays.includes(dayOfWeek);

      // Filtrar fichadas: comparar con el dateStr (YYYY-MM-DD)
      const fichadasDelDia = fichadas.filter(f => {
        // Al usar local-as-UTC, el timestamp ya tiene los componentes "locales" en sus getters UTC
        const fDateStr = f.timestamp.toISOString().split('T')[0];
        return fDateStr === dateStr;
      });

      const resultado = InterpretationService.analizarJornada(isLaborable, fichadasDelDia, horario);

      if (resultado.ausencia) {
        detectedNovelties.push({
          empleadoid: empleado.id,
          tipo: 'ausencia_injustificada',
          fechasafectadas: dateStr,
          cantidad: 1,
          unidad: 'día',
          estado: 'pendiente',
          origen: 'automatica',
          periodo: periodo,
          observacion: 'Ausencia detectada automáticamente.'
        });
      } else {
        if (resultado.tardanza) {
          detectedNovelties.push({
            empleadoid: empleado.id,
            tipo: 'tardanza',
            fechasafectadas: dateStr,
            cantidad: resultado.minutosTardanza,
            unidad: 'minutos',
            estado: 'pendiente',
            origen: 'automatica',
            periodo: periodo,
            observacion: `Tardanza detectada: ${resultado.minutosTardanza} min.`
          });
        }
        if (resultado.horasExtra > 0) {
          detectedNovelties.push({
            empleadoid: empleado.id,
            tipo: 'horas_extra_100', // Por defecto 100 en interpretación automática simple
            fechasafectadas: dateStr,
            cantidad: resultado.horasExtra,
            unidad: 'minutos',
            estado: 'pendiente',
            origen: 'automatica',
            periodo: periodo,
            observacion: `Horas extra detectadas: ${resultado.horasExtra} min.`
          });
        }
      }
      currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
    }

    // 5. Persistir novedades detectadas de forma atómica y evitando duplicados
    try {
      // Borrar automáticas previas y crear las nuevas en una transacción.
      // Usamos createMany con skipDuplicates: true para que, si por alguna razón
      // se reciben llamadas concurrentes, la BD evite duplicados (requiere
      // índice único compuesto en el modelo `novedades`).
      await prisma.$transaction([
        prisma.novedades.deleteMany({
          where: {
            empleadoid: Number(empleadoId),
            origen: 'automatica',
            periodo: {
              startsWith: periodo.substring(0, 7) // Asegura borrar todo el mes/año
            }
          }
        }),
        prisma.novedades.createMany({ data: detectedNovelties as any[], skipDuplicates: true })
      ]);
    } catch (dbErr) {
      console.error('[Interpretación] Error al persistir novedades en transacción:', dbErr);
    }

    res.json({
      message: 'Interpretación completada con éxito',
      novedadesDetectadas: detectedNovelties.length
    });

  } catch (error) {
    console.error('Error crítico en processInterpretation:', error);
    res.status(500).json({ message: 'Error al procesar interpretación', error });
  }
};
