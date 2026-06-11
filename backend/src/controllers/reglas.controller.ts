import { Request, Response } from 'express';
import { prisma } from '../db/prisma';

export const getReglas = async (_req: Request, res: Response) => {
  try {
    const reglas = await prisma.reglas_empresa.findMany({
      orderBy: { clave: 'asc' }
    });
    res.json(reglas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener reglas', error });
  }
};

export const updateRegla = async (req: Request, res: Response) => {
  try {
    const clave = req.params.clave as string;
    const { valor, descripcion } = req.body;
    if (valor === undefined) {
      return res.status(400).json({ message: 'Falta el campo valor' });
    }
    const regla = await prisma.reglas_empresa.update({
      where: { clave },
      data: { valor: String(valor) }
    });
    res.json(regla);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Regla no encontrada' });
    }
    res.status(500).json({ message: 'Error al actualizar regla', error });
  }
};

// Helper para obtener reglas como mapa (uso interno)
export const getReglasMap = async (): Promise<Record<string, string>> => {
  const reglas = await prisma.reglas_empresa.findMany();
  const map: Record<string, string> = {};
  for (const r of reglas) {
    map[r.clave] = r.valor;
  }
  return map;
};
