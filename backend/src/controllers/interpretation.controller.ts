import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { InterpretationService, ReglasConfig } from '../services/interpretation.service';
import { getReglasMap } from './reglas.controller';
import { isPeriodoCerrado } from '../utils/periodo-cerrado';

// Valores por defecto para las reglas (si no existen en la DB)
const REGLAS_DEFAULTS: ReglasConfig = {
  doble_fichada_umbral_minutos: 5,
  salida_anticipada_tolerancia_minutos: 10,
  horas_extra_tipo_domingo_feriado: 100,
  horas_extra_tipo_habil: 50,
  descanso_no_tomado_habilitar: true,
  ausencia_auto_estado: 'pendiente'
};

/**
 * Carga las reglas de la DB y las combina con los defaults.
 */
async function loadReglas(): Promise<ReglasConfig> {
  const map = await getReglasMap();
  return {
    doble_fichada_umbral_minutos: Number(map['doble_fichada_umbral_minutos'] ?? REGLAS_DEFAULTS.doble_fichada_umbral_minutos),
    salida_anticipada_tolerancia_minutos: Number(map['salida_anticipada_tolerancia_minutos'] ?? REGLAS_DEFAULTS.salida_anticipada_tolerancia_minutos),
    horas_extra_tipo_domingo_feriado: Number(map['horas_extra_tipo_domingo_feriado'] ?? REGLAS_DEFAULTS.horas_extra_tipo_domingo_feriado),
    horas_extra_tipo_habil: Number(map['horas_extra_tipo_habil'] ?? REGLAS_DEFAULTS.horas_extra_tipo_habil),
    descanso_no_tomado_habilitar: (map['descanso_no_tomado_habilitar'] ?? 'true') === 'true',
    ausencia_auto_estado: map['ausencia_auto_estado'] ?? REGLAS_DEFAULTS.ausencia_auto_estado,
  };
}

/**
 * Carga los feriados del período como un Set de fechas en formato YYYY-MM-DD.
 */
async function loadFeriadosSet(startDate: string, endDate: string): Promise<Set<string>> {
  const feriados = await prisma.feriados.findMany({
    where: {
      fecha: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
  });
  const set = new Set<string>();
  for (const f of feriados) {
    set.add(f.fecha.toISOString().split('T')[0]);
  }
  return set;
}

export const processInterpretation = async (req: Request, res: Response) => {
  try {
    const { empleadoId, startDate, endDate } = req.body;

    if (!empleadoId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos: empleadoId, startDate, endDate' });
    }

    // Preparar periodo
    const periodo = startDate.substring(0, 7);

    // Guard: verificar si el período está cerrado
    if (await isPeriodoCerrado(periodo)) {
      return res.status(400).json({ message: 'No se puede reprocesar la interpretación de un período cerrado' });
    }

    // Parsear fechas como locales (no como UTC)
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    end.setHours(23, 59, 59, 999);

    // 1. Obtener Empleado y su Horario
    const empleado = await prisma.empleados.findUnique({
      where: { id: Number(empleadoId) },
      include: { 
        horarios: true,
        rotaciones: {
          include: {
            turnos: { include: { horarios: true }, orderBy: { semana: 'asc' } }
          }
        }
      }
    });

    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    if (empleado.estado !== 'activo') {
      return res.json({
        message: 'Empleado no activo, no se procesa interpretación',
        novedadesDetectadas: 0
      });
    }

    // 2. Cargar reglas parametrizables y feriados
    const reglas = await loadReglas();
    const feriadosSet = await loadFeriadosSet(startDate, endDate);

    // 3. Preparar fecha de ingreso del empleado

    const formatUTCDate = (date: Date): string => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const fechaIngresoEmpleado = empleado.fechaingreso ? new Date(empleado.fechaingreso) : null;
    const fechaIngresoStr = fechaIngresoEmpleado ? formatUTCDate(fechaIngresoEmpleado) : null;

    // 4. Obtener Fichadas del rango
    const fichadas = await prisma.fichadas.findMany({
      where: {
        empleadoid: Number(empleadoId),
        timestamp: { gte: start, lte: end }
      },
      orderBy: { timestamp: 'asc' }
    });

    // 4.5 Obtener Novedades Aprobadas de Ausencia para evitar generar anomalías encima
    const TIPOS_JUSTIFICADA = [
      'ausencia_justificada', 'licencia_enfermedad', 'licencia_examen',
      'vacaciones', 'permiso_especial'
    ];
    const novedadesAprobadas = await prisma.novedades.findMany({
      where: {
        empleadoid: Number(empleadoId),
        estado: 'aprobada',
        tipo: { in: TIPOS_JUSTIFICADA }
      }
    });

    const fechasJustificadas = new Set<string>();
    for (const n of novedadesAprobadas) {
      if (n.fechasafectadas) {
        const fArray = n.fechasafectadas.split(',').map((f: string) => f.trim());
        for (const f of fArray) {
          fechasJustificadas.add(f);
        }
      }
    }

    // 5. Procesar día por día
    const detectedNovelties: any[] = [];

    const effectiveStartStr = fechaIngresoStr && startDate < fechaIngresoStr ? fechaIngresoStr : startDate;
    const effectiveStart = parseLocalDate(effectiveStartStr);

    const currentIterDate = new Date(Date.UTC(effectiveStart.getFullYear(), effectiveStart.getMonth(), effectiveStart.getDate()));
    const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));

    while (currentIterDate <= endUTC) {
      const dateStr = currentIterDate.toISOString().split('T')[0];
      const dayOfWeek = currentIterDate.getUTCDay();

      if (fechaIngresoStr && dateStr < fechaIngresoStr) {
        currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
        continue;
      }

      // Si el día ya está justificado por una novedad manual (ej. vacaciones), saltar interpretación
      if (fechasJustificadas.has(dateStr)) {
        currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
        continue;
      }

      // Resolver horario (fijo o rotativo)
      let horario = empleado.horarios;
      if (empleado.rotacionid && empleado.rotaciones) {
        const fi = empleado.rotaciones.fechainicio;
        const fiUTC = Date.UTC(fi.getUTCFullYear(), fi.getUTCMonth(), fi.getUTCDate());
        const diffTime = currentIterDate.getTime() - fiUTC;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          const semanasDesdeInicio = Math.floor(diffDays / 7);
          const semanaActual = (semanasDesdeInicio % empleado.rotaciones.ciclosemanas) + 1;
          const turnoActivo = empleado.rotaciones.turnos.find((t: any) => t.semana === semanaActual);
          if (turnoActivo && turnoActivo.horarios) {
            horario = turnoActivo.horarios;
          }
        }
      }

      if (!horario) {
        currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
        continue;
      }

      // Determinar si es día laborable
      const dayMap: Record<string, number> = {
        'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6
      };
      const laborableDays = horario.diassemana.toLowerCase().split(',').map((d: string) => dayMap[d.trim()]);
      const isLaborable = laborableDays.includes(dayOfWeek);

      // Determinar si es domingo o feriado
      const esDomingo = dayOfWeek === 0;
      const esFeriado = feriadosSet.has(dateStr);
      const esDomingoOFeriado = esDomingo || esFeriado;

      // Filtrar fichadas del día
      const fichadasDelDia = fichadas.filter(f => {
        const fDateStr = f.timestamp.toISOString().split('T')[0];
        return fDateStr === dateStr;
      });

      // Ejecutar motor de interpretación
      const resultado = InterpretationService.analizarJornada(
        isLaborable, fichadasDelDia, horario, esDomingoOFeriado, reglas
      );

      // Generar novedades según el resultado
      if (resultado.ausencia) {
        detectedNovelties.push({
          empleadoid: empleado.id,
          tipo: 'ausencia_injustificada',
          fechasafectadas: dateStr,
          cantidad: 1,
          unidad: 'dias',
          estado: reglas.ausencia_auto_estado,
          origen: 'automatica',
          periodo,
          observacion: 'Ausencia detectada automáticamente.'
        });
      } else {
        // Tardanza
        if (resultado.tardanza) {
          detectedNovelties.push({
            empleadoid: empleado.id,
            tipo: 'tardanza',
            fechasafectadas: dateStr,
            cantidad: resultado.minutosTardanza,
            unidad: 'minutos',
            estado: 'pendiente',
            origen: 'automatica',
            periodo,
            observacion: `Tardanza detectada: ${resultado.minutosTardanza} min.`
          });
        }

        // Horas extra (50% o 100% según el día)
        if (resultado.horasExtra > 0) {
          detectedNovelties.push({
            empleadoid: empleado.id,
            tipo: resultado.tipoHorasExtra,
            fechasafectadas: dateStr,
            cantidad: resultado.horasExtra,
            unidad: 'minutos',
            estado: 'pendiente',
            origen: 'automatica',
            periodo,
            observacion: resultado.feriadoTrabajado
              ? `${esFeriado ? 'Feriado' : 'Domingo'} trabajado: ${resultado.horasExtra} min al 100%.`
              : `Horas extra detectadas (${resultado.tipoHorasExtra === 'horas_extra_100' ? '100%' : '50%'}): ${resultado.horasExtra} min.${esFeriado ? ' (Feriado)' : esDomingo ? ' (Domingo)' : ''}`
          });
        }

        // Salida anticipada
        if (resultado.salidaAnticipada) {
          detectedNovelties.push({
            empleadoid: empleado.id,
            tipo: 'salida_anticipada',
            fechasafectadas: dateStr,
            cantidad: resultado.minutosSalidaAnticipada,
            unidad: 'minutos',
            estado: 'pendiente',
            origen: 'automatica',
            periodo,
            observacion: `Salida anticipada: ${resultado.minutosSalidaAnticipada} min antes del horario.`
          });
        }

        // Dobles fichadas (anomalías)
        for (const doble of resultado.dobleFichadas) {
          detectedNovelties.push({
            empleadoid: empleado.id,
            tipo: 'doble_fichada',
            fechasafectadas: dateStr,
            cantidad: 1,
            unidad: 'dias',
            estado: 'pendiente',
            origen: 'automatica',
            periodo,
            observacion: `Doble fichada de ${doble.tipo} detectada. Requiere resolución manual.`
          });
        }

        // Descanso no tomado
        if (resultado.descansoNoTomado) {
          detectedNovelties.push({
            empleadoid: empleado.id,
            tipo: 'descanso_no_tomado',
            fechasafectadas: dateStr,
            cantidad: horario.minutosmindescanso,
            unidad: 'minutos',
            estado: 'pendiente',
            origen: 'automatica',
            periodo,
            observacion: `Descanso mínimo de ${horario.minutosmindescanso} min no registrado.`
          });
        }
      }

      currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
    }

    // 6. Persistir novedades detectadas de forma atómica
    try {
      await prisma.$transaction([
        prisma.novedades.deleteMany({
          where: {
            empleadoid: Number(empleadoId),
            origen: 'automatica',
            periodo: {
              startsWith: periodo.substring(0, 7)
            }
          }
        }),
        prisma.novedades.createMany({ data: detectedNovelties, skipDuplicates: true })
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
