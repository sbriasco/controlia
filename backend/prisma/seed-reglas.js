require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedReglas() {
  const reglas = [
    { clave: 'doble_fichada_umbral_minutos', valor: '5', descripcion: 'Minutos entre dos fichadas del mismo tipo para considerarla doble fichada' },
    { clave: 'salida_anticipada_tolerancia_minutos', valor: '10', descripcion: 'Minutos de tolerancia antes de la hora de salida para no marcar como salida anticipada' },
    { clave: 'horas_extra_tipo_domingo_feriado', valor: '100', descripcion: 'Porcentaje de horas extra en domingos y feriados' },
    { clave: 'horas_extra_tipo_habil', valor: '50', descripcion: 'Porcentaje de horas extra en dias habiles' },
    { clave: 'descanso_no_tomado_habilitar', valor: 'true', descripcion: 'Habilitar la deteccion de descansos no tomados' },
    { clave: 'ausencia_auto_estado', valor: 'pendiente', descripcion: 'Estado inicial de las ausencias detectadas automaticamente' },
  ];

  for (const regla of reglas) {
    await prisma.reglas_empresa.upsert({
      where: { clave: regla.clave },
      update: {},
      create: regla,
    });
  }
  console.log('Reglas iniciales cargadas exitosamente');
}

seedReglas()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect(); });
