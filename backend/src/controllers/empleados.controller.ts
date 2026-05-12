import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { mapFromPrismaHorario } from './horarios.controller';

const mapToPrismaEmpleado = (data: any) => {
  const mapped: any = {};
  if (data.legajo !== undefined) mapped.legajo = data.legajo;
  if (data.nombre !== undefined) mapped.nombre = data.nombre;
  if (data.apellido !== undefined) mapped.apellido = data.apellido;
  if (data.dni !== undefined) mapped.dni = data.dni;
  if (data.cuil !== undefined) mapped.cuil = data.cuil;
  if (data.fechaIngreso !== undefined) mapped.fechaingreso = new Date(data.fechaIngreso);
  if (data.categoriaLaboral !== undefined) mapped.categorialaboral = data.categoriaLaboral;
  if (data.convenio !== undefined) mapped.convenio = data.convenio;
  if (data.tipoJornada !== undefined) mapped.tipojornada = data.tipoJornada;
  if (data.horarioId !== undefined) mapped.horarioid = data.horarioId;
  if (data.diasDescanso !== undefined) {
    mapped.diasdescanso = Array.isArray(data.diasDescanso) ? data.diasDescanso.join(',') : data.diasDescanso;
  }
  if (data.modalidadFichada !== undefined) mapped.modalidadfichada = data.modalidadFichada;
  if (data.estado !== undefined) mapped.estado = data.estado;
  return mapped;
};

const mapFromPrismaEmpleado = (p: any) => {
  if (!p) return p;
  return {
    id: p.id,
    legajo: p.legajo,
    nombre: p.nombre,
    apellido: p.apellido,
    dni: p.dni,
    cuil: p.cuil,
    fechaIngreso: p.fechaingreso,
    categoriaLaboral: p.categorialaboral,
    convenio: p.convenio,
    tipoJornada: p.tipojornada,
    horarioId: p.horarioid,
    diasDescanso: p.diasdescanso ? p.diasdescanso.split(',') : [],
    modalidadFichada: p.modalidadfichada,
    estado: p.estado,
    horarios: p.horarios ? mapFromPrismaHorario(p.horarios) : undefined
  };
};

export const getEmpleados = async (req: Request, res: Response) => {
  try {
    const empleados = await prisma.empleados.findMany({
      include: {
        horarios: true,
      },
      orderBy: { apellido: 'asc' },
    });
    res.json(empleados.map(mapFromPrismaEmpleado));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener empleados', error });
  }
};

export const getEmpleadoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const empleado = await prisma.empleados.findUnique({
      where: { id: Number(id) },
      include: {
        horarios: true,
      },
    });
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    res.json(mapFromPrismaEmpleado(empleado));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener empleado', error });
  }
};

export const createEmpleado = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const existe = await prisma.empleados.findFirst({
      where: {
        OR: [
          { legajo: data.legajo },
          { dni: data.dni },
          { cuil: data.cuil }
        ]
      }
    });

    if (existe) {
      return res.status(400).json({ message: 'Legajo, DNI o CUIL ya registrados en el sistema' });
    }

    const nuevoEmpleado = await prisma.empleados.create({
      data: mapToPrismaEmpleado(data),
      include: {
        horarios: true
      }
    });
    res.status(201).json(mapFromPrismaEmpleado(nuevoEmpleado));
  } catch (error) {
    res.status(500).json({ message: 'Error al crear empleado', error });
  }
};

export const updateEmpleado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const empleadoActualizado = await prisma.empleados.update({
      where: { id: Number(id) },
      data: mapToPrismaEmpleado(data),
      include: {
        horarios: true
      }
    });
    res.json(mapFromPrismaEmpleado(empleadoActualizado));
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar empleado', error });
  }
};

export const deleteEmpleado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const empleadoId = Number(id);

    const empleado = await prisma.empleados.findUnique({ where: { id: empleadoId } });
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Query params:
    // - deleteUsers=true -> attempt to delete usuario records linked to this empleado (only if they have no external refs)
    const deleteUsers = req.query.deleteUsers === 'true';

    // Gather user ids related to this empleado
    const usuariosRelacionados = await prisma.usuarios.findMany({ where: { empleadoid: empleadoId }, select: { id: true } });
    const usuarioIds = usuariosRelacionados.map(u => u.id);

    if (deleteUsers && usuarioIds.length > 0) {
      // Check external references for each usuario: fichadas.usuarioregistro and cierresmensuales.usuariocierreid
      for (const uid of usuarioIds) {
        const [fichadasCount, cierresCount] = await Promise.all([
          prisma.fichadas.count({ where: { usuarioregistro: uid } }),
          prisma.cierresmensuales.count({ where: { usuariocierreid: uid } })
        ]);
        if (fichadasCount > 0 || cierresCount > 0) {
          return res.status(400).json({ message: `No se puede eliminar el usuario ${uid}: tiene referencias en fichadas o cierresmensuales` });
        }
      }
    }

    // Perform deletions/updates in a single transaction to ensure atomicity.
    // If deleteUsers=true and checks passed, delete those usuarios inside the transaction;
    // otherwise nullify usuario.empleadoid.
    const ops: any[] = [];

    // 1. Romper auto-referencias en fichadas para evitar errores de FK al borrar en lote (mismo empleado)
    ops.push(prisma.fichadas.updateMany({ 
      where: { empleadoid: empleadoId }, 
      data: { fichadaoriginalid: null } 
    }));

    ops.push(prisma.cierremensualdetalles.deleteMany({ where: { empleadoid: empleadoId } }));
    ops.push(prisma.novedades.deleteMany({ where: { empleadoid: empleadoId } }));
    ops.push(prisma.fichadas.deleteMany({ where: { empleadoid: empleadoId } }));

    if (deleteUsers && usuarioIds.length > 0) {
      ops.push(prisma.usuarios.deleteMany({ where: { id: { in: usuarioIds } } }));
    } else {
      ops.push(prisma.usuarios.updateMany({ where: { empleadoid: empleadoId }, data: { empleadoid: null } }));
    }

    ops.push(prisma.empleados.delete({ where: { id: empleadoId } }));

    await prisma.$transaction(ops);

    res.status(204).send();
  } catch (error: any) {
    console.error('[DeleteEmpleado] Error:', error);
    res.status(500).json({ 
      message: 'Error al eliminar empleado. Posiblemente tenga registros dependientes o vinculados.',
      details: error.message 
    });
  }
};
