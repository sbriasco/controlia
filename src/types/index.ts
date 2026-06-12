/* ===================================
   Controlia — TypeScript Types
   =================================== */

// ── Auth & Roles ──
export type UserRole = 'admin' | 'empleado' | 'contador';

export interface User {
  id: number;
  nombre: string;
  rol: UserRole;
  email?: string;
  empleadoId?: number | null;
  avatar?: string;
}

// ── Empleado ──
export type EstadoEmpleado = 'activo' | 'inactivo' | 'suspendido';
export type TipoJornada = 'completa' | 'parcial' | 'flexible';
export type ModalidadFichada = 'biometrico' | 'qr' | 'pin' | 'manual' | 'api';

export interface Empleado {
  id: number;
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  fechaIngreso: string;
  categoriaLaboral: string;
  convenio?: string;
  tipoJornada: TipoJornada;
  horarioId?: number;
  rotacionId?: number;
  diasDescanso: string[];
  modalidadFichada: ModalidadFichada;
  estado: EstadoEmpleado;
  email?: string;
  telefono?: string;
  horarios?: Horario;
  rotacion?: Rotacion;
}

// ── Horarios y Rotaciones ──
export type TipoHorario = 'fijo' | 'rotativo' | 'flexible' | 'parcial';

export interface Rotacion {
  id: number;
  nombre: string;
  cicloSemanas: number;
  fechaInicio: string; // ISO date
  turnos: RotacionTurno[];
}

export interface RotacionTurno {
  id: number;
  rotacionId: number;
  semana: number;
  horarioId: number;
  horarios?: Horario;
}

export interface Horario {
  id: number;
  nombre: string;
  tipo: TipoHorario;
  diasSemana: string[];
  horaEntrada: string;   // HH:mm
  horaSalida: string;    // HH:mm
  toleranciaEntrada: number;  // minutos
  toleranciaSalida: number;   // minutos
  descansoInicio?: string;    // HH:mm
  descansoFin?: string;       // HH:mm
  minutosMinDescanso: number;
  umbralHorasExtra: number;   // minutos
}

// ── Fichadas ──
export type TipoFichada = 'entrada' | 'salida';
export type OrigenFichada = 'biometrico' | 'manual' | 'qr' | 'api' | 'pin';

export interface Fichada {
  id: number;
  empleadoId: number;
  timestamp: string;     // ISO date string
  tipo: TipoFichada;
  origen: OrigenFichada;
  usuarioRegistro?: number;  // ID de quien registró (si manual)
  motivo?: string;           // Motivo si fue manual
  esCorreccion: boolean;
  fichadaOriginalId?: number;
}

// ── Novedades ──
export type TipoNovedad =
  | 'tardanza'
  | 'ausencia_justificada'
  | 'ausencia_injustificada'
  | 'horas_extra_50'
  | 'horas_extra_100'
  | 'salida_anticipada'
  | 'licencia_enfermedad'
  | 'licencia_examen'
  | 'vacaciones'
  | 'suspension'
  | 'permiso_especial'
  | 'descanso_excedido'
  | 'doble_fichada'
  | 'descanso_no_tomado';

export type EstadoNovedad = 'pendiente' | 'aprobada' | 'rechazada';
export type OrigenNovedad = 'automatica' | 'manual';

export interface Novedad {
  id: number;
  empleadoId: number;
  tipo: TipoNovedad;
  fechas: string[];         // Dates affected
  cantidad: number;          // minutes/hours/days depending on type
  unidad: 'minutos' | 'horas' | 'dias';
  estado: EstadoNovedad;
  origen: OrigenNovedad;
  observacion?: string;
  periodo: string;           // YYYY-MM
  usuarioAccionId?: number | null;
  fechaAccion?: string | null;
  usuarioAccion?: { id: number; nombre: string } | null;
}

// ── Cierre Mensual ──
export type EstadoCierre = 'borrador' | 'cerrado';

export interface CierreMensual {
  id: number;
  periodo: string;           // YYYY-MM
  fechaCierre?: string;
  usuarioCierre?: number;
  estado: EstadoCierre;
  resumenEmpleados: ResumenEmpleado[];
}

export interface ResumenEmpleado {
  empleadoId: number;
  diasTrabajados: number;
  ausenciasJustificadas: number;
  ausenciasInjustificadas: number;
  horasExtra50: number;       // in minutes
  horasExtra100: number;      // in minutes
  tardanzasAcumuladas: number; // in minutes
  novedadesAprobadas: number[];  // Novedad IDs
}

// ── Feriados ──
export interface Feriado {
  id: number;
  fecha: string;
  descripcion: string;
  tipo: 'nacional' | 'provincial' | 'empresa';
}

// ── Reglas de Empresa ──
export interface ReglaEmpresa {
  id: number;
  clave: string;
  valor: string;
  descripcion?: string;
}

// ── Navigation ──
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
}
