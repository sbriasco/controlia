import { prisma } from '../db/prisma';

/**
 * Verifica si un período (YYYY-MM) tiene un cierre con estado 'cerrado'.
 * Usado como guard en fichadas, novedades e interpretación.
 */
export async function isPeriodoCerrado(periodo: string): Promise<boolean> {
  const cierre = await prisma.cierresmensuales.findFirst({
    where: { periodo, estado: 'cerrado' }
  });
  return !!cierre;
}
