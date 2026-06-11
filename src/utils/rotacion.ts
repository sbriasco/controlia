import type { Empleado, Horario } from '../types';

export const getHorarioForDate = (empleado: Empleado, dateString: string): Horario | undefined => {
  // 1. Si tiene horario fijo, retornamos ese.
  if (empleado.horarios) {
    return empleado.horarios;
  }

  // 2. Si tiene rotación, calculamos.
  if (empleado.rotacion) {
    const rotacion = empleado.rotacion;
    const targetDate = new Date(dateString);
    const targetUTC = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const fi = new Date(rotacion.fechaInicio);
    const fiUTC = Date.UTC(fi.getUTCFullYear(), fi.getUTCMonth(), fi.getUTCDate());

    const diffTime = targetUTC - fiUTC;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      const semanasDesdeInicio = Math.floor(diffDays / 7);
      const semanaActual = (semanasDesdeInicio % rotacion.cicloSemanas) + 1;
      
      const turnoActivo = rotacion.turnos.find(t => t.semana === semanaActual);
      if (turnoActivo && turnoActivo.horarios) {
        return turnoActivo.horarios;
      }
    }
  }

  return undefined;
};
