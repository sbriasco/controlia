import { Request, Response } from 'express';
import { prisma } from '../db/prisma';

export const getFeriados = async (req: Request, res: Response) => {
  try {
    const { anio } = req.query;
    let where: any = {};
    if (anio) {
      const start = new Date(`${anio}-01-01`);
      const end = new Date(`${anio}-12-31`);
      where.fecha = { gte: start, lte: end };
    }
    const feriados = await prisma.feriados.findMany({
      where,
      orderBy: { fecha: 'asc' }
    });
    res.json(feriados.map(f => ({
      id: f.id,
      fecha: f.fecha.toISOString().split('T')[0],
      descripcion: f.descripcion,
      tipo: f.tipo
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener feriados', error });
  }
};

export const createFeriado = async (req: Request, res: Response) => {
  try {
    const { fecha, descripcion, tipo } = req.body;
    if (!fecha || !descripcion || !tipo) {
      return res.status(400).json({ message: 'Faltan campos requeridos: fecha, descripcion, tipo' });
    }
    const feriado = await prisma.feriados.create({
      data: {
        fecha: new Date(fecha),
        descripcion,
        tipo
      }
    });
    res.status(201).json({
      id: feriado.id,
      fecha: feriado.fecha.toISOString().split('T')[0],
      descripcion: feriado.descripcion,
      tipo: feriado.tipo
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe un feriado en esa fecha' });
    }
    res.status(500).json({ message: 'Error al crear feriado', error });
  }
};

export const updateFeriado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fecha, descripcion, tipo } = req.body;
    const data: any = {};
    if (fecha !== undefined) data.fecha = new Date(fecha);
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (tipo !== undefined) data.tipo = tipo;

    const feriado = await prisma.feriados.update({
      where: { id: Number(id) },
      data
    });
    res.json({
      id: feriado.id,
      fecha: feriado.fecha.toISOString().split('T')[0],
      descripcion: feriado.descripcion,
      tipo: feriado.tipo
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar feriado', error });
  }
};

export const deleteFeriado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.feriados.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar feriado', error });
  }
};

export const importFeriadosAr = async (req: Request, res: Response) => {
  try {
    const { anio } = req.params;
    const response = await fetch(`https://api.argentinadatos.com/v1/feriados/${anio}`);
    if (!response.ok) {
      throw new Error('Error al consultar API externa');
    }
    const feriadosAr = await response.json();

    let importedCount = 0;
    for (const f of feriadosAr) {
      const fechaObj = new Date(f.fecha);
      
      // Check if exists
      const exists = await prisma.feriados.findUnique({
        where: { fecha: fechaObj }
      });

      if (!exists) {
        await prisma.feriados.create({
          data: {
            fecha: fechaObj,
            descripcion: f.nombre,
            tipo: 'nacional'
          }
        });
        importedCount++;
      }
    }

    res.json({ message: 'Importación exitosa', importedCount });
  } catch (error: any) {
    res.status(500).json({ message: 'Error al importar feriados', error: error.message });
  }
};
