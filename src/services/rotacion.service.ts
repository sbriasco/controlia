import { fetchApi } from './api';
import type { Rotacion } from '../types';

let rotacionesCache: Rotacion[] | null = null;
let lastFetch = 0;
const CACHE_DURATION = 300000; // 5 minutos de caché

const notifyRotacionesChanged = () => {
  const version = Date.now().toString();
  localStorage.setItem('rotacionesVersion', version);
  window.dispatchEvent(new CustomEvent('rotaciones:changed', { detail: { version } }));
};

const mapFromApi = (data: any): Rotacion => ({
  id: data.id,
  nombre: data.nombre,
  cicloSemanas: data.ciclosemanas,
  fechaInicio: data.fechainicio ? new Date(data.fechainicio).toISOString() : '',
  turnos: data.turnos || []
});

export const rotacionService = {
  getAll: async (): Promise<Rotacion[]> => {
    if (rotacionesCache && Date.now() - lastFetch < CACHE_DURATION) {
      return rotacionesCache;
    }
    const data = await fetchApi('/rotaciones');
    const mapped = data.map(mapFromApi);
    rotacionesCache = mapped;
    lastFetch = Date.now();
    return mapped;
  },
  
  getById: async (id: number): Promise<Rotacion> => {
    if (rotacionesCache) {
      const cached = rotacionesCache.find(r => r.id === id);
      if (cached) return cached;
    }
    const data = await fetchApi(`/rotaciones/${id}`);
    return mapFromApi(data);
  },
  
  create: async (data: any): Promise<Rotacion> => {
    // Map to API format
    const payload = {
      nombre: data.nombre,
      ciclosemanas: data.cicloSemanas,
      fechainicio: data.fechaInicio,
      turnos: data.turnos
    };

    const res = await fetchApi('/rotaciones', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    rotacionesCache = null;
    notifyRotacionesChanged();
    return mapFromApi(res);
  },
    
  update: async (id: number, data: any): Promise<Rotacion> => {
    const payload = {
      nombre: data.nombre,
      ciclosemanas: data.cicloSemanas,
      fechainicio: data.fechaInicio,
      turnos: data.turnos
    };

    const res = await fetchApi(`/rotaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    rotacionesCache = null;
    notifyRotacionesChanged();
    return mapFromApi(res);
  },
    
  delete: async (id: number): Promise<void> => {
    await fetchApi(`/rotaciones/${id}`, {
      method: 'DELETE',
    });
    if (rotacionesCache) {
      rotacionesCache = rotacionesCache.filter(r => r.id !== id);
    }
    notifyRotacionesChanged();
  },
};
