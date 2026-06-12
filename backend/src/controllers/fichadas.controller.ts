import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { isPeriodoCerrado } from '../utils/periodo-cerrado';

// ── Mappers ────────────────────────────────────────────────────

const mapFromPrismaFichada = (p: any) => {
  if (!p) return p;
  return {
    id: p.id,
    empleadoId: p.empleadoid,
    timestamp: p.timestamp,
    tipo: p.tipo,
    origen: p.origen,
    usuarioRegistro: p.usuarioregistro ?? undefined,
    motivo: p.motivo ?? undefined,
    esCorreccion: p.escorreccion,
    fichadaOriginalId: p.fichadaoriginalid ?? undefined,
    // Datos del empleado (cuando se incluye el join)
    empleado: p.empleados
      ? {
          id: p.empleados.id,
          legajo: p.empleados.legajo,
          nombre: p.empleados.nombre,
          apellido: p.empleados.apellido,
        }
      : undefined,
  };
};

// ── GET /api/fichadas ──────────────────────────────────────────

export const getFichadas = async (req: Request, res: Response) => {
  try {
    const { fecha, empleadoId } = req.query;

    const where: any = {};

    // Filtro por fecha (un día exacto)
    if (fecha) {
      const day = new Date(fecha as string);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      where.timestamp = { gte: day, lt: nextDay };
    }

    // Filtro por empleado
    if (empleadoId) {
      where.empleadoid = Number(empleadoId);
    }

    const fichadas = await prisma.fichadas.findMany({
      where,
      include: {
        empleados: {
          select: { id: true, legajo: true, nombre: true, apellido: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json(fichadas.map(mapFromPrismaFichada));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener fichadas', error });
  }
};

// ── GET /api/fichadas/:id ──────────────────────────────────────

export const getFichadaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fichada = await prisma.fichadas.findUnique({
      where: { id: Number(id) },
      include: {
        empleados: {
          select: { id: true, legajo: true, nombre: true, apellido: true },
        },
      },
    });

    if (!fichada) {
      return res.status(404).json({ message: 'Fichada no encontrada' });
    }

    res.json(mapFromPrismaFichada(fichada));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener fichada', error });
  }
};

// ── POST /api/fichadas ─────────────────────────────────────────

export const createFichada = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Guard: verificar si el período está cerrado
    const ts = new Date(data.timestamp);
    const periodo = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
    if (await isPeriodoCerrado(periodo)) {
      return res.status(400).json({ message: 'No se pueden registrar fichadas en un período cerrado' });
    }

    // Verificar que el empleado existe y está activo
    const empleado = await prisma.empleados.findUnique({
      where: { id: data.empleadoId },
    });

    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    if (empleado.estado !== 'activo') {
      return res.status(400).json({ message: 'El empleado no está activo' });
    }

    // Si es corrección, verificar que la fichada original existe
    if (data.esCorreccion && data.fichadaOriginalId) {
      const original = await prisma.fichadas.findUnique({
        where: { id: data.fichadaOriginalId },
      });
      if (!original) {
        return res.status(404).json({ message: 'Fichada original no encontrada' });
      }
    }

    const nuevaFichada = await prisma.fichadas.create({
      data: {
        empleadoid: data.empleadoId,
        timestamp: new Date(data.timestamp),
        tipo: data.tipo,
        origen: data.origen ?? 'manual',
        usuarioregistro: data.usuarioRegistro ?? null,
        motivo: data.motivo ?? null,
        escorreccion: data.esCorreccion ?? false,
        fichadaoriginalid: data.fichadaOriginalId ?? null,
      },
      include: {
        empleados: {
          select: { id: true, legajo: true, nombre: true, apellido: true },
        },
      },
    });

    res.status(201).json(mapFromPrismaFichada(nuevaFichada));
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar fichada', error });
  }
};

// ── DELETE /api/fichadas/:id ───────────────────────────────────
// Las fichadas son inmutables según las reglas del dominio.
// Solo se permite borrar fichadas manuales por error de carga.

export const deleteFichada = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const fichada = await prisma.fichadas.findUnique({ where: { id: Number(id) } });

    if (!fichada) {
      return res.status(404).json({ message: 'Fichada no encontrada' });
    }

    if (fichada.origen !== 'manual') {
      return res.status(400).json({
        message: 'Solo se pueden eliminar fichadas de origen manual. Las demás son inmutables.',
      });
    }

    // Guard: verificar si el período está cerrado
    const periodo = `${fichada.timestamp.getFullYear()}-${String(fichada.timestamp.getMonth() + 1).padStart(2, '0')}`;
    if (await isPeriodoCerrado(periodo)) {
      return res.status(400).json({ message: 'No se pueden eliminar fichadas de un período cerrado' });
    }

    await prisma.fichadas.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar fichada', error });
  }
};
