import { fetchApi } from './api';
import type { CierreMensual } from '../types';

export const cierreService = {
  getAll: async (): Promise<CierreMensual[]> => {
    return fetchApi('/cierres');
  },

  getById: async (id: number): Promise<CierreMensual> => {
    return fetchApi(`/cierres/${id}`);
  },

  consolidar: async (periodo: string): Promise<CierreMensual> => {
    return fetchApi('/cierres/consolidar', {
      method: 'POST',
      body: JSON.stringify({ periodo }),
    });
  },

  cerrar: async (id: number, usuarioId: number): Promise<CierreMensual> => {
    return fetchApi(`/cierres/${id}/cerrar`, {
      method: 'PATCH',
      body: JSON.stringify({ usuarioId }),
    });
  },

  reabrir: async (id: number): Promise<CierreMensual> => {
    return fetchApi(`/cierres/${id}/reabrir`, {
      method: 'PATCH',
    });
  },
};
