import { fetchApi } from './api';
import type { Fichada } from '../types';

export interface CreateFichadaPayload {
  empleadoId: number;
  timestamp: string;        // ISO string
  tipo: 'entrada' | 'salida';
  origen?: 'biometrico' | 'manual' | 'qr' | 'api' | 'pin';
  usuarioRegistro?: number;
  motivo?: string;
  esCorreccion?: boolean;
  fichadaOriginalId?: number;
}

let fichadasCache: Record<string, { data: Fichada[]; timestamp: number }> = {};
const CACHE_DURATION = 300000; // 5 minutos de caché

const notifyFichadasChanged = () => {
  const version = Date.now().toString();
  localStorage.setItem('fichadasVersion', version);
  window.dispatchEvent(new CustomEvent('fichadas:changed', { detail: { version } }));
};

export const fichadaService = {
  getAll: async (params?: { fecha?: string; empleadoId?: number }): Promise<Fichada[]> => {
    const query = new URLSearchParams();
    if (params?.fecha) query.set('fecha', params.fecha);
    if (params?.empleadoId) query.set('empleadoId', String(params.empleadoId));
    const qs = query.toString() ? `?${query.toString()}` : '';
    
    const cacheKey = qs || 'all';
    
    if (fichadasCache[cacheKey] && Date.now() - fichadasCache[cacheKey].timestamp < CACHE_DURATION) {
      return fichadasCache[cacheKey].data;
    }

    const data = await fetchApi(`/fichadas${qs}`);
    fichadasCache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  },

  getById: async (id: number): Promise<Fichada> => {
    // Attempt to find in any cache
    for (const key in fichadasCache) {
      const cached = fichadasCache[key].data.find(f => f.id === id);
      if (cached) return cached;
    }
    return fetchApi(`/fichadas/${id}`);
  },

  create: async (data: CreateFichadaPayload): Promise<Fichada> => {
    const res = await fetchApi('/fichadas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    fichadasCache = {}; // Invalida el caché
    notifyFichadasChanged();
    return res;
  },

  delete: async (id: number): Promise<void> => {
    await fetchApi(`/fichadas/${id}`, { method: 'DELETE' });
    fichadasCache = {}; // Invalida el caché
    notifyFichadasChanged();
  },
};
