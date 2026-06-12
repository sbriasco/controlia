import { Request, Response } from 'express';
import { prisma } from '../db/prisma';

// ── Tipos de novedades para clasificación ──
const TIPOS_AUSENCIA_JUSTIFICADA = [
  'ausencia_justificada', 'licencia_enfermedad', 'licencia_examen',
  'vacaciones', 'permiso_especial'
];
const TIPOS_AUSENCIA_INJUSTIFICADA = ['ausencia_injustificada'];

// ── Mappers ──
const mapCierre = (c: any) => ({
  id: c.id,
  periodo: c.periodo,
  fechaCierre: c.fechacierre,
  usuarioCierre: c.usuariocierreid,
  estado: c.estado,
  cantidadEmpleados: c._count?.cierremensualdetalles ?? c.cierremensualdetalles?.length ?? 0,
  usuarioNombre: c.usuarios?.nombre ?? null,
});

const mapDetalle = (d: any) => ({
  empleadoId: d.empleadoid,
  diasTrabajados: d.diastrabajados,
  ausenciasJustificadas: d.ausenciasjustificadas,
  ausenciasInjustificadas: d.ausenciasinjustificadas,
  horasExtra50: d.horasextra50,
  horasExtra100: d.horasextra100,
  tardanzasAcumuladas: d.tardanzasacumuladas,
  empleado: d.empleados ? {
    id: d.empleados.id,
    legajo: d.empleados.legajo,
    nombre: d.empleados.nombre,
    apellido: d.empleados.apellido,
  } : undefined,
});

// ── GET /api/cierres ──
export const getCierres = async (_req: Request, res: Response) => {
  try {
    const cierres = await prisma.cierresmensuales.findMany({
      include: {
        usuarios: { select: { id: true, nombre: true } },
        _count: { select: { cierremensualdetalles: true } }
      },
      orderBy: { periodo: 'desc' }
    });
    res.json(cierres.map(mapCierre));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cierres', error });
  }
};

// ── GET /api/cierres/:id ──
export const getCierreById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cierre = await prisma.cierresmensuales.findUnique({
      where: { id: Number(id) },
      include: {
        usuarios: { select: { id: true, nombre: true } },
        cierremensualdetalles: {
          include: {
            empleados: { select: { id: true, legajo: true, nombre: true, apellido: true } }
          },
          orderBy: { empleadoid: 'asc' }
        }
      }
    });

    if (!cierre) {
      return res.status(404).json({ message: 'Cierre no encontrado' });
    }

    res.json({
      ...mapCierre(cierre),
      resumenEmpleados: cierre.cierremensualdetalles.map(mapDetalle),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cierre', error });
  }
};

// ── POST /api/cierres/consolidar ──
export const consolidarPeriodo = async (req: Request, res: Response) => {
  try {
    const { periodo } = req.body; // "YYYY-MM"

    if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ message: 'Período inválido. Formato esperado: YYYY-MM' });
    }

    // Verificar que no exista un cierre cerrado para este período
    const cierreExistente = await prisma.cierresmensuales.findFirst({
      where: { periodo, estado: 'cerrado' }
    });
    if (cierreExistente) {
      return res.status(400).json({ message: 'Ya existe un cierre cerrado para este período. No se puede reconsolidar.' });
    }

    // Si hay un borrador previo, eliminarlo para regenerar
    const borradorPrevio = await prisma.cierresmensuales.findFirst({
      where: { periodo, estado: 'borrador' }
    });
    if (borradorPrevio) {
      await prisma.$transaction([
        prisma.cierremensualdetalles.deleteMany({ where: { cierremensualid: borradorPrevio.id } }),
        prisma.cierresmensuales.delete({ where: { id: borradorPrevio.id } }),
      ]);
    }

    // Obtener empleados activos
    const empleados = await prisma.empleados.findMany({
      where: { estado: 'activo' },
      include: {
        horarios: true,
        rotaciones: {
          include: { turnos: { include: { horarios: true }, orderBy: { semana: 'asc' } } }
        }
      }
    });

    // Calcular rango de fechas del período
    const [year, month] = periodo.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0)); // último día del mes

    // Obtener todas las novedades aprobadas del período
    const novedadesAprobadas = await prisma.novedades.findMany({
      where: { periodo, estado: 'aprobada' }
    });

    // Construir mapa de novedades por empleado
    const novedadesPorEmpleado = new Map<number, typeof novedadesAprobadas>();
    for (const n of novedadesAprobadas) {
      const arr = novedadesPorEmpleado.get(n.empleadoid) || [];
      arr.push(n);
      novedadesPorEmpleado.set(n.empleadoid, arr);
    }

    // Calcular detalle por empleado
    const detalles: any[] = [];

    for (const emp of empleados) {
      // Contar días laborales del período
      let diasLaborales = 0;
      const horario = emp.horarios;

      if (!horario) continue; // Sin horario asignado, no se puede calcular

      const dayMap: Record<string, number> = {
        'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3,
        'jueves': 4, 'viernes': 5, 'sabado': 6
      };
      const laborableDays = horario.diassemana.toLowerCase().split(',').map((d: string) => dayMap[d.trim()]);

      const currentDay = new Date(startDate);
      // No contar días antes de la fecha de ingreso
      const fechaIngreso = emp.fechaingreso ? new Date(emp.fechaingreso) : null;

      while (currentDay <= endDate) {
        if (fechaIngreso && currentDay < fechaIngreso) {
          currentDay.setUTCDate(currentDay.getUTCDate() + 1);
          continue;
        }
        if (laborableDays.includes(currentDay.getUTCDay())) {
          diasLaborales++;
        }
        currentDay.setUTCDate(currentDay.getUTCDate() + 1);
      }

      // Procesar novedades del empleado
      const novs = novedadesPorEmpleado.get(emp.id) || [];

      let ausenciasJustificadas = 0;
      let ausenciasInjustificadas = 0;
      let horasExtra50 = 0;
      let horasExtra100 = 0;
      let tardanzasAcumuladas = 0;

      for (const n of novs) {
        const cant = Number(n.cantidad);
        if (TIPOS_AUSENCIA_JUSTIFICADA.includes(n.tipo)) {
          ausenciasJustificadas += n.unidad === 'dias' ? cant : 0;
        } else if (TIPOS_AUSENCIA_INJUSTIFICADA.includes(n.tipo)) {
          ausenciasInjustificadas += n.unidad === 'dias' ? cant : 0;
        } else if (n.tipo === 'horas_extra_50') {
          horasExtra50 += cant;
        } else if (n.tipo === 'horas_extra_100') {
          horasExtra100 += cant;
        } else if (n.tipo === 'tardanza') {
          tardanzasAcumuladas += cant;
        }
      }

      const diasTrabajados = Math.max(0, diasLaborales - ausenciasJustificadas - ausenciasInjustificadas);

      detalles.push({
        empleadoid: emp.id,
        diastrabajados: diasTrabajados,
        ausenciasjustificadas: ausenciasJustificadas,
        ausenciasinjustificadas: ausenciasInjustificadas,
        horasextra50: horasExtra50,
        horasextra100: horasExtra100,
        tardanzasacumuladas: tardanzasAcumuladas,
      });
    }

    // Crear cierre y detalles en una transacción
    const nuevoCierre = await prisma.cierresmensuales.create({
      data: {
        periodo,
        estado: 'borrador',
        cierremensualdetalles: {
          create: detalles,
        },
      },
      include: {
        cierremensualdetalles: {
          include: {
            empleados: { select: { id: true, legajo: true, nombre: true, apellido: true } }
          },
          orderBy: { empleadoid: 'asc' }
        },
        usuarios: { select: { id: true, nombre: true } },
      }
    });

    res.status(201).json({
      ...mapCierre(nuevoCierre),
      resumenEmpleados: nuevoCierre.cierremensualdetalles.map(mapDetalle),
    });
  } catch (error) {
    console.error('[consolidarPeriodo] Error:', error);
    res.status(500).json({ message: 'Error al consolidar período', error });
  }
};

// ── PATCH /api/cierres/:id/cerrar ──
export const cerrarPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { usuarioId } = req.body;

    const cierre = await prisma.cierresmensuales.findUnique({ where: { id: Number(id) } });

    if (!cierre) {
      return res.status(404).json({ message: 'Cierre no encontrado' });
    }

    if (cierre.estado === 'cerrado') {
      return res.status(400).json({ message: 'Este período ya está cerrado' });
    }

    // Verificar que no haya novedades pendientes
    const pendientes = await prisma.novedades.count({
      where: { periodo: cierre.periodo, estado: 'pendiente' }
    });

    if (pendientes > 0) {
      return res.status(400).json({
        message: `Hay ${pendientes} novedad(es) pendiente(s). Aprobá o rechazá todas antes de cerrar.`
      });
    }

    const actualizado = await prisma.cierresmensuales.update({
      where: { id: Number(id) },
      data: {
        estado: 'cerrado',
        fechacierre: new Date(),
        usuariocierreid: usuarioId ? Number(usuarioId) : null,
      },
      include: {
        usuarios: { select: { id: true, nombre: true } },
      }
    });

    res.json(mapCierre(actualizado));
  } catch (error) {
    res.status(500).json({ message: 'Error al cerrar período', error });
  }
};

// ── PATCH /api/cierres/:id/reabrir ──
export const reabrirPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cierre = await prisma.cierresmensuales.findUnique({ where: { id: Number(id) } });

    if (!cierre) {
      return res.status(404).json({ message: 'Cierre no encontrado' });
    }

    if (cierre.estado !== 'cerrado') {
      return res.status(400).json({ message: 'Solo se pueden reabrir períodos cerrados' });
    }

    const actualizado = await prisma.cierresmensuales.update({
      where: { id: Number(id) },
      data: {
        estado: 'borrador',
        fechacierre: null,
        usuariocierreid: null,
      },
      include: {
        usuarios: { select: { id: true, nombre: true } },
      }
    });

    res.json(mapCierre(actualizado));
  } catch (error) {
    res.status(500).json({ message: 'Error al reabrir período', error });
  }
};
