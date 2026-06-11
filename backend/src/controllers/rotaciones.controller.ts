import { Request, Response } from 'express';
import { prisma } from '../db/prisma';

export const getRotaciones = async (req: Request, res: Response) => {
  try {
    const rotaciones = await prisma.rotaciones.findMany({
      include: {
        turnos: {
          include: {
            horarios: true
          },
          orderBy: { semana: 'asc' }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    res.json(rotaciones);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rotaciones', error });
  }
};

export const getRotacionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rotacion = await prisma.rotaciones.findUnique({
      where: { id: Number(id) },
      include: {
        turnos: {
          include: {
            horarios: true
          },
          orderBy: { semana: 'asc' }
        }
      }
    });
    if (!rotacion) {
      return res.status(404).json({ message: 'Rotación no encontrada' });
    }
    res.json(rotacion);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rotación', error });
  }
};

export const createRotacion = async (req: Request, res: Response) => {
  try {
    const { nombre, ciclosemanas, fechainicio, turnos } = req.body;
    
    const nuevaRotacion = await prisma.$transaction(async (tx) => {
      const rotacion = await tx.rotaciones.create({
        data: {
          nombre,
          ciclosemanas: Number(ciclosemanas),
          fechainicio: new Date(fechainicio),
        }
      });

      if (turnos && turnos.length > 0) {
        await tx.rotacion_turnos.createMany({
          data: turnos.map((t: any) => ({
            rotacionid: rotacion.id,
            semana: Number(t.semana),
            horarioid: Number(t.horarioid)
          }))
        });
      }

      return tx.rotaciones.findUnique({
        where: { id: rotacion.id },
        include: { turnos: { include: { horarios: true }, orderBy: { semana: 'asc' } } }
      });
    });

    res.status(201).json(nuevaRotacion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear rotación', error });
  }
};

export const updateRotacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, ciclosemanas, fechainicio, turnos } = req.body;

    const rotacionActualizada = await prisma.$transaction(async (tx) => {
      const rotacion = await tx.rotaciones.update({
        where: { id: Number(id) },
        data: {
          nombre,
          ciclosemanas: Number(ciclosemanas),
          fechainicio: new Date(fechainicio),
        }
      });

      if (turnos) {
        // Eliminar turnos existentes y crear los nuevos para evitar manejar updates complejos
        await tx.rotacion_turnos.deleteMany({
          where: { rotacionid: rotacion.id }
        });

        if (turnos.length > 0) {
          await tx.rotacion_turnos.createMany({
            data: turnos.map((t: any) => ({
              rotacionid: rotacion.id,
              semana: Number(t.semana),
              horarioid: Number(t.horarioid)
            }))
          });
        }
      }

      return tx.rotaciones.findUnique({
        where: { id: rotacion.id },
        include: { turnos: { include: { horarios: true }, orderBy: { semana: 'asc' } } }
      });
    });

    res.json(rotacionActualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rotación', error });
  }
};

export const deleteRotacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const empleados = await prisma.empleados.findFirst({
      where: { rotacionid: Number(id) }
    });
    
    if (empleados) {
      return res.status(400).json({ message: 'No se puede eliminar porque hay empleados asignados a esta rotación' });
    }

    await prisma.rotaciones.delete({
      where: { id: Number(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar rotación', error });
  }
};
