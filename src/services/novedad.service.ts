import { fetchApi } from './api';
import type { Novedad } from '../types';

export const novedadService = {
  getAll: async (params?: { empleadoId?: number; periodo?: string }): Promise<Novedad[]> => {
    const query = new URLSearchParams();
    if (params?.empleadoId) query.set('empleadoId', String(params.empleadoId));
    if (params?.periodo) query.set('periodo', params.periodo);
    const qs = query.toString() ? `?${query.toString()}` : '';
    
    return fetchApi(`/novedades${qs}`);
  },

  processInterpretation: async (empleadoId: number, startDate: string, endDate: string): Promise<{ message: string; novedadesDetectadas: number }> => {
    return fetchApi('/interpretation/process', {
      method: 'POST',
      body: JSON.stringify({ empleadoId, startDate, endDate }),
    });
  }
};
