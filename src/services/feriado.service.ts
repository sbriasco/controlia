import type { Feriado } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const feriadoService = {
  getAll: async (anio?: number): Promise<Feriado[]> => {
    let url = `${API_URL}/feriados`;
    if (anio) url += `?anio=${anio}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al obtener feriados');
    return response.json();
  },

  create: async (data: Omit<Feriado, 'id'>): Promise<Feriado> => {
    const response = await fetch(`${API_URL}/feriados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al crear feriado');
    return response.json();
  },

  importar: async (anio: number): Promise<{ message: string; importedCount: number }> => {
    const response = await fetch(`${API_URL}/feriados/importar/${anio}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Error al importar feriados');
    return response.json();
  },

  update: async (id: number, data: Partial<Feriado>): Promise<Feriado> => {
    const response = await fetch(`${API_URL}/feriados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al actualizar feriado');
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/feriados/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error al eliminar feriado');
  }
};
