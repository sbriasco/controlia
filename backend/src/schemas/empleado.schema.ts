import { z } from 'zod';

export const createEmpleadoSchema = z.object({
  body: z.object({
    legajo: z.string().min(1, 'El legajo es requerido').max(50),
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
    apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(100),
    dni: z.string().regex(/^\d{7,10}$/, 'El DNI debe contener solo números (7-10 dígitos)').max(20),
    cuil: z.string().regex(/^\d{10,12}$/, 'El CUIL debe contener solo números (10-12 dígitos)').max(20),
    fechaIngreso: z.string().min(10, 'La fecha de ingreso es requerida'),
    categoriaLaboral: z.string().min(1, 'La categoría es requerida').max(100),
    convenio: z.string().max(100).optional().nullable(),
    tipoJornada: z.string().min(1, 'El tipo de jornada es requerido').max(50),
    // 0/null para empleados rotativos (sin horario fijo); el controlador mapea 0 -> null
    horarioId: z.number().int().nonnegative('El horarioId debe ser un ID válido').nullable().optional(),
    diasDescanso: z.union([z.string(), z.array(z.string())]),
    modalidadFichada: z.string().min(1, 'La modalidad de fichada es requerida').max(50),
    estado: z.string().min(1, 'El estado es requerido').max(50),
  }).passthrough(),
});

export const updateEmpleadoSchema = z.object({
  body: z.object({
    legajo: z.string().min(1).max(50).optional(),
    nombre: z.string().min(2).max(100).optional(),
    apellido: z.string().min(2).max(100).optional(),
    dni: z.string().regex(/^\d{7,10}$/).max(20).optional(),
    cuil: z.string().regex(/^\d{10,12}$/).max(20).optional(),
    fechaIngreso: z.string().optional(),
    categoriaLaboral: z.string().min(1).max(100).optional(),
    convenio: z.string().max(100).optional().nullable(),
    tipoJornada: z.string().min(1).max(50).optional(),
    horarioId: z.number().int().nonnegative().nullable().optional(),
    diasDescanso: z.union([z.string(), z.array(z.string())]).optional(),
    modalidadFichada: z.string().min(1).max(50).optional(),
    estado: z.string().min(1).max(50).optional(),
  }).passthrough(),
});
