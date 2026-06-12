import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedUsuarios() {
  console.log('Seeding usuarios...');

  // 1. Limpiar usuarios existentes (cuidado con FKs)
  // Primero sacamos la referencia de usuarioregistro en fichadas
  await prisma.fichadas.updateMany({
    data: { usuarioregistro: null },
  });
  // Luego borramos usuarios
  await prisma.usuarios.deleteMany();

  // 2. Crear los usuarios (hasheando sus contraseñas)
  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordEmpleado = await bcrypt.hash('empleado123', 10);
  const passwordContador = await bcrypt.hash('contador123', 10);

  const usuarios = [
    {
      nombre: 'Administrador del Sistema',
      email: 'admin@controlia.com',
      passwordhash: passwordAdmin,
      rol: 'admin',
      empleadoid: null,
    },
    {
      nombre: 'Juan Pérez',
      email: 'juan.perez@controlia.com',
      passwordhash: passwordEmpleado,
      rol: 'empleado',
      empleadoid: 1,
    },
    {
      nombre: 'María Gómez',
      email: 'maria.gomez@controlia.com',
      passwordhash: passwordEmpleado,
      rol: 'empleado',
      empleadoid: 2, // Se corresponde al empleadoId 2 (María Gómez en la DB de semilla)
    },
    {
      nombre: 'Carlos López',
      email: 'carlos.lopez@controlia.com',
      passwordhash: passwordEmpleado,
      rol: 'empleado',
      empleadoid: 3,
    },
    {
      nombre: 'Laura Fernández',
      email: 'laura.fernandez@controlia.com',
      passwordhash: passwordEmpleado,
      rol: 'empleado',
      empleadoid: 4,
    },
    {
      nombre: 'Cr. Daniel Méndez',
      email: 'contador@controlia.com',
      passwordhash: passwordContador,
      rol: 'contador',
      empleadoid: null,
    },
  ];

  for (const u of usuarios) {
    await prisma.usuarios.create({
      data: u,
    });
  }

  console.log(`✅ ${usuarios.length} usuarios creados exitosamente.`);
}

seedUsuarios()
  .catch((e) => {
    console.error('Error seeding usuarios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
