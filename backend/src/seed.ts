import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DIRECT_URL || process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const horarios = [
  {
    id: 1,
    nombre: 'Turno Mañana - Oficina',
    tipo: 'fijo',
    diasSemana: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
    horaEntrada: '09:00',
    horaSalida: '18:00',
    toleranciaEntrada: 5,
    toleranciaSalida: 5,
    descansoInicio: '13:00',
    descansoFin: '14:00',
    minutosMinDescanso: 60,
    umbralHorasExtra: 15,
  },
  {
    id: 2,
    nombre: 'Turno Tarde - Comercio',
    tipo: 'fijo',
    diasSemana: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    horaEntrada: '14:00',
    horaSalida: '22:00',
    toleranciaEntrada: 10,
    toleranciaSalida: 5,
    descansoInicio: '18:00',
    descansoFin: '18:30',
    minutosMinDescanso: 30,
    umbralHorasExtra: 15,
  },
  {
    id: 3,
    nombre: 'Jornada Reducida',
    tipo: 'parcial',
    diasSemana: ['lunes', 'miércoles', 'viernes'],
    horaEntrada: '08:00',
    horaSalida: '12:00',
    toleranciaEntrada: 5,
    toleranciaSalida: 5,
    descansoInicio: null,
    descansoFin: null,
    minutosMinDescanso: 0,
    umbralHorasExtra: 15,
  },
];

const empleados = [
  {
    id: 1,
    legajo: '001',
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '30.456.789',
    cuil: '20-30456789-5',
    fechaIngreso: '2023-03-15',
    categoriaLaboral: 'Administrativo',
    convenio: 'Comercio',
    tipoJornada: 'completa',
    horarioId: 1,
    diasDescanso: ['sábado', 'domingo'],
    modalidadFichada: 'biometrico',
    estado: 'activo',
  },
  {
    id: 2,
    legajo: '002',
    nombre: 'María',
    apellido: 'Gómez',
    dni: '31.567.890',
    cuil: '27-31567890-4',
    fechaIngreso: '2022-08-01',
    categoriaLaboral: 'Vendedor',
    convenio: 'Comercio',
    tipoJornada: 'completa',
    horarioId: 2,
    diasDescanso: ['domingo'],
    modalidadFichada: 'qr',
    estado: 'activo',
  },
  {
    id: 3,
    legajo: '003',
    nombre: 'Carlos',
    apellido: 'López',
    dni: '28.345.678',
    cuil: '20-28345678-3',
    fechaIngreso: '2021-01-10',
    categoriaLaboral: 'Operario',
    convenio: 'Metalúrgico',
    tipoJornada: 'completa',
    horarioId: 1,
    diasDescanso: ['sábado', 'domingo'],
    modalidadFichada: 'biometrico',
    estado: 'activo',
  },
  {
    id: 4,
    legajo: '004',
    nombre: 'Laura',
    apellido: 'Fernández',
    dni: '33.678.901',
    cuil: '27-33678901-2',
    fechaIngreso: '2024-02-20',
    categoriaLaboral: 'Administrativo',
    convenio: 'Comercio',
    tipoJornada: 'parcial',
    horarioId: 3,
    diasDescanso: ['martes', 'jueves', 'sábado', 'domingo'],
    modalidadFichada: 'pin',
    estado: 'activo',
  },
  {
    id: 5,
    legajo: '005',
    nombre: 'Roberto',
    apellido: 'Martínez',
    dni: '29.234.567',
    cuil: '20-29234567-1',
    fechaIngreso: '2020-06-15',
    categoriaLaboral: 'Encargado',
    convenio: 'Comercio',
    tipoJornada: 'completa',
    horarioId: 2,
    diasDescanso: ['domingo'],
    modalidadFichada: 'biometrico',
    estado: 'activo',
  },
  {
    id: 6,
    legajo: '006',
    nombre: 'Ana',
    apellido: 'Rodríguez',
    dni: '32.456.789',
    cuil: '27-32456789-6',
    fechaIngreso: '2023-09-01',
    categoriaLaboral: 'Vendedor',
    convenio: 'Comercio',
    tipoJornada: 'completa',
    horarioId: 2,
    diasDescanso: ['domingo'],
    modalidadFichada: 'qr',
    estado: 'activo',
  },
  {
    id: 7,
    legajo: '007',
    nombre: 'Diego',
    apellido: 'Silva',
    dni: '27.123.456',
    cuil: '20-27123456-7',
    fechaIngreso: '2019-11-01',
    categoriaLaboral: 'Operario',
    convenio: 'Metalúrgico',
    tipoJornada: 'completa',
    horarioId: 1,
    diasDescanso: ['sábado', 'domingo'],
    modalidadFichada: 'biometrico',
    estado: 'suspendido',
  },
  {
    id: 8,
    legajo: '008',
    nombre: 'Valentina',
    apellido: 'Torres',
    dni: '34.789.012',
    cuil: '27-34789012-8',
    fechaIngreso: '2024-05-10',
    categoriaLaboral: 'Administrativo',
    convenio: 'Comercio',
    tipoJornada: 'completa',
    horarioId: 1,
    diasDescanso: ['sábado', 'domingo'],
    modalidadFichada: 'pin',
    estado: 'activo',
  },
  {
    id: 9,
    legajo: '009',
    nombre: 'Martín',
    apellido: 'Herrera',
    dni: '26.012.345',
    cuil: '20-26012345-9',
    fechaIngreso: '2018-03-01',
    categoriaLaboral: 'Encargado',
    convenio: 'Comercio',
    tipoJornada: 'completa',
    horarioId: 1,
    diasDescanso: ['sábado', 'domingo'],
    modalidadFichada: 'biometrico',
    estado: 'inactivo',
  },
  {
    id: 10,
    legajo: '010',
    nombre: 'Sofía',
    apellido: 'Ruiz',
    dni: '35.890.123',
    cuil: '27-35890123-0',
    fechaIngreso: '2025-01-15',
    categoriaLaboral: 'Administrativo',
    convenio: 'Comercio',
    tipoJornada: 'parcial',
    horarioId: 3,
    diasDescanso: ['martes', 'jueves', 'sábado', 'domingo'],
    modalidadFichada: 'pin',
    estado: 'activo',
  },
];

async function main() {
  console.log("Limpiando DB...");
  await prisma.empleados.deleteMany();
  await prisma.horarios.deleteMany();

  console.log("Creando Horarios...");
  for (const h of horarios) {
    await prisma.horarios.create({
      data: {
        id: h.id,
        nombre: h.nombre,
        tipo: h.tipo,
        diassemana: h.diasSemana.join(','),
        horaentrada: new Date(`1970-01-01T${h.horaEntrada}:00Z`),
        horasalida: new Date(`1970-01-01T${h.horaSalida}:00Z`),
        toleranciaentrada: h.toleranciaEntrada,
        toleranciasalida: h.toleranciaSalida,
        descansoinicio: h.descansoInicio ? new Date(`1970-01-01T${h.descansoInicio}:00Z`) : null,
        descansofin: h.descansoFin ? new Date(`1970-01-01T${h.descansoFin}:00Z`) : null,
        minutosmindescanso: h.minutosMinDescanso,
        umbralhorasextra: h.umbralHorasExtra,
      }
    });
  }

  console.log("Creando Empleados...");
  for (const e of empleados) {
    await prisma.empleados.create({
      data: {
        id: e.id,
        legajo: e.legajo,
        nombre: e.nombre,
        apellido: e.apellido,
        dni: e.dni,
        cuil: e.cuil,
        fechaingreso: new Date(`${e.fechaIngreso}T00:00:00Z`),
        categorialaboral: e.categoriaLaboral,
        convenio: e.convenio || '',
        tipojornada: e.tipoJornada,
        horarioid: e.horarioId,
        diasdescanso: e.diasDescanso.join(','),
        modalidadfichada: e.modalidadFichada,
        estado: e.estado,
      }
    });
  }

  console.log("Ajustando secuencias para auto-increment...");
  // Set autoincrement sequence past the max seeded IDs to avoid collisions on new inserts
  await prisma.$executeRawUnsafe(`SELECT setval('horarios_id_seq', (SELECT MAX(id) FROM horarios));`);
  await prisma.$executeRawUnsafe(`SELECT setval('empleados_id_seq', (SELECT MAX(id) FROM empleados));`);

  console.log("¡Datos sembrados con éxito!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
