import { Request, Response } from 'express';
import { prisma } from '../db/prisma';

export const getNovedades = async (req: Request, res: Response) => {
  try {
    const { empleadoId, periodo } = req.query;
    const where: any = {};

    if (empleadoId) where.empleadoid = Number(empleadoId);
    if (periodo) where.periodo = String(periodo);

    const novedades = await prisma.novedades.findMany({
      where,
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
      periodo: n.periodo
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
      periodo: nuevaNovedad.periodo
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear novedad', error });
  }
};

export const updateEstadoNovedad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const novedadActualizada = await prisma.novedades.update({
      where: { id: Number(id) },
      data: { estado }
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
      periodo: novedadActualizada.periodo
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado', error });
  }
};
