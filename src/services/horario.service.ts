import { fetchApi } from './api';
import type { Horario } from '../types';

let horariosCache: Horario[] | null = null;
let lastFetch = 0;
const CACHE_DURATION = 300000; // 5 minutos de caché

const notifyHorariosChanged = () => {
  const version = Date.now().toString();
  localStorage.setItem('horariosVersion', version);
  window.dispatchEvent(new CustomEvent('horarios:changed', { detail: { version } }));
};

export const horarioService = {
  getAll: async (): Promise<Horario[]> => {
    if (horariosCache && Date.now() - lastFetch < CACHE_DURATION) {
      return horariosCache;
    }
    const data = await fetchApi('/horarios');
    horariosCache = data;
    lastFetch = Date.now();
    return data;
  },
  
  getById: async (id: number): Promise<Horario> => {
    if (horariosCache) {
      const cached = horariosCache.find(h => h.id === id);
      if (cached) return cached;
    }
    return fetchApi(`/horarios/${id}`);
  },
  
  create: async (data: Omit<Horario, 'id'>): Promise<Horario> => {
    const res = await fetchApi('/horarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    horariosCache = null; // Invalida el caché
    notifyHorariosChanged();
    return res;
  },
    
  update: async (id: number, data: Partial<Horario>): Promise<Horario> => {
    const res = await fetchApi(`/horarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    horariosCache = null; // Invalida el caché
    notifyHorariosChanged();
    return res;
  },
    
  delete: async (id: number): Promise<void> => {
    await fetchApi(`/horarios/${id}`, {
      method: 'DELETE',
    });
    if (horariosCache) {
      horariosCache = horariosCache.filter(h => h.id !== id);
    }
    notifyHorariosChanged();
  },
};
