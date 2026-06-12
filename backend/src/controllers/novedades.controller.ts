import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { isPeriodoCerrado } from '../utils/periodo-cerrado';

export const getNovedades = async (req: Request, res: Response) => {
  try {
    const { empleadoId, periodo } = req.query;
    const where: any = {};

    if (empleadoId) where.empleadoid = Number(empleadoId);
    if (periodo) where.periodo = String(periodo);

    const novedades = await prisma.novedades.findMany({
      where,
      include: {
        usuarios: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { fechasafectadas: 'desc' }
    });

    res.json(novedades.map(n => ({
      id: n.id,
      empleadoId: n.empleadoid,
      tipo: n.tipo,
      fechas: n.fechasafectadas.split(','),
      cantidad: Number(n.cantidad),
      unidad: n.unidad,
      estado: n.estado,
      origen: n.origen,
      observacion: n.observacion,
      periodo: n.periodo,
      usuarioAccionId: n.usuarioaccionid ?? null,
      fechaAccion: n.fechaaccion ?? null,
      usuarioAccion: n.usuarios ? { id: n.usuarios.id, nombre: n.usuarios.nombre } : null
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener novedades', error });
  }
};

export const createNovedad = async (req: Request, res: Response) => {
  try {
    const { empleadoId, tipo, fechas, observacion } = req.body;
    
    if (!empleadoId || !tipo || !fechas || !fechas.length) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos' });
    }

    // Calcular periodo usando la primera fecha
    const primeraFecha = fechas[0];
    const periodo = primeraFecha.substring(0, 7); // YYYY-MM

    // Guard: verificar si el período está cerrado
    if (await isPeriodoCerrado(periodo)) {
      return res.status(400).json({ message: 'No se pueden crear novedades en un período cerrado' });
    }
    
    // Calcular cantidad y unidad. Simplificado: 1 dia por fecha.
    const cantidad = fechas.length;
    const unidad = 'dias';

    const nuevaNovedad = await prisma.novedades.create({
      data: {
        empleadoid: Number(empleadoId),
        tipo,
        fechasafectadas: fechas.join(','),
        cantidad,
        unidad,
        estado: 'pendiente',
        origen: 'manual',
        observacion,
        periodo
      }
    });

    res.status(201).json({
      id: nuevaNovedad.id,
      empleadoId: nuevaNovedad.empleadoid,
      tipo: nuevaNovedad.tipo,
      fechas: nuevaNovedad.fechasafectadas.split(','),
      cantidad: Number(nuevaNovedad.cantidad),
      unidad: nuevaNovedad.unidad,
      estado: nuevaNovedad.estado,
      origen: nuevaNovedad.origen,
      observacion: nuevaNovedad.observacion,
      periodo: nuevaNovedad.periodo,
      usuarioAccionId: nuevaNovedad.usuarioaccionid ?? null,
      fechaAccion: nuevaNovedad.fechaaccion ?? null,
      usuarioAccion: null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear novedad', error });
  }
};

  export const updateEstadoNovedad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado, usuarioId } = req.body;

    if (!['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    // Guard: verificar si el período está cerrado
    const novedad = await prisma.novedades.findUnique({ where: { id: Number(id) } });
    if (novedad && await isPeriodoCerrado(novedad.periodo)) {
      return res.status(400).json({ message: 'No se pueden modificar novedades de un período cerrado' });
    }

    const novedadActualizada = await prisma.novedades.update({
      where: { id: Number(id) },
      data: { 
        estado,
        usuarioaccionid: estado === 'pendiente' ? null : (usuarioId ? Number(usuarioId) : null),
        fechaaccion: estado === 'pendiente' ? null : new Date(),
      },
      include: {
        usuarios: {
          select: { id: true, nombre: true }
        }
      }
    });

    res.json({
      id: novedadActualizada.id,
      empleadoId: novedadActualizada.empleadoid,
      tipo: novedadActualizada.tipo,
      fechas: novedadActualizada.fechasafectadas.split(','),
      cantidad: Number(novedadActualizada.cantidad),
      unidad: novedadActualizada.unidad,
      estado: novedadActualizada.estado,
      origen: novedadActualizada.origen,
      observacion: novedadActualizada.observacion,
      periodo: novedadActualizada.periodo,
      usuarioAccionId: novedadActualizada.usuarioaccionid ?? null,
      fechaAccion: novedadActualizada.fechaaccion ?? null,
      usuarioAccion: novedadActualizada.usuarios ? { id: novedadActualizada.usuarios.id, nombre: novedadActualizada.usuarios.nombre } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado', error });
  }
};
