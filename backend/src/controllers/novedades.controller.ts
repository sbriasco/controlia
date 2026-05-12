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
