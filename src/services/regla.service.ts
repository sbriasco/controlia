import type { ReglaEmpresa } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const reglaService = {
  getAll: async (): Promise<ReglaEmpresa[]> => {
    const response = await fetch(`${API_URL}/reglas`);
    if (!response.ok) throw new Error('Error al obtener reglas');
    return response.json();
  },

  update: async (clave: string, valor: string): Promise<ReglaEmpresa> => {
    const response = await fetch(`${API_URL}/reglas/${clave}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor }),
    });
    if (!response.ok) throw new Error('Error al actualizar regla');
    return response.json();
  }
};
