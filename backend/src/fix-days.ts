import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DIRECT_URL || process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Corrigiendo acentos en la base de datos...");
  await prisma.$executeRawUnsafe(`UPDATE horarios SET diassemana = REPLACE(diassemana, 'sábado', 'sabado');`);
  await prisma.$executeRawUnsafe(`UPDATE horarios SET diassemana = REPLACE(diassemana, 'miércoles', 'miercoles');`);
  await prisma.$executeRawUnsafe(`UPDATE empleados SET diasdescanso = REPLACE(diasdescanso, 'sábado', 'sabado');`);
  await prisma.$executeRawUnsafe(`UPDATE empleados SET diasdescanso = REPLACE(diasdescanso, 'miércoles', 'miercoles');`);
  console.log("¡Hecho!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
