import 'dotenv/config';
import { prisma } from '../src/db/prisma';

async function main() {
  console.log('[cleanup] Iniciando limpieza de novedades duplicadas (origen = automatica)...');
  const sql = `WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY empleadoid, tipo, fechasafectadas, origen, periodo ORDER BY id) AS rn
    FROM novedades
    WHERE origen = 'automatica'
  )
  DELETE FROM novedades
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);`;

  try {
    const result = await prisma.$executeRawUnsafe(sql);
    console.log('[cleanup] Filas afectadas:', result);
  } catch (err) {
    console.error('[cleanup] Error ejecutando limpieza:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
