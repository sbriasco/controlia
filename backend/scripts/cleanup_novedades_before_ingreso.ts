import 'dotenv/config';
import { prisma } from '../src/db/prisma';

async function main() {
  console.log('[cleanup-ingreso] Eliminando novedades automáticas con fechas anteriores a fechaingreso del empleado...');

  const sql = `DELETE FROM novedades n
WHERE n.origen = 'automatica'
  AND EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.id = n.empleadoid
      AND to_date(n.fechasafectadas, 'YYYY-MM-DD') < e.fechaingreso
  );`;

  try {
    const result = await prisma.$executeRawUnsafe(sql);
    console.log('[cleanup-ingreso] Filas afectadas:', result);
  } catch (err) {
    console.error('[cleanup-ingreso] Error ejecutando limpieza:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
