import { fetchApi } from './api';
import type { Empleado } from '../types';

let empleadosCache: Empleado[] | null = null;
let lastFetch = 0;
const CACHE_DURATION = 300000; // 5 minutos de caché

const notifyEmpleadosChanged = () => {
  const version = Date.now().toString();
  localStorage.setItem('empleadosVersion', version);
  window.dispatchEvent(new CustomEvent('empleados:changed', { detail: { version } }));
};

export const empleadoService = {
  getAll: async (): Promise<Empleado[]> => {
    if (empleadosCache && Date.now() - lastFetch < CACHE_DURATION) {
      return empleadosCache;
    }
    const data = await fetchApi('/empleados');
    empleadosCache = data;
    lastFetch = Date.now();
    return data;
  },
  
  getById: async (id: number): Promise<Empleado> => {
    if (empleadosCache) {
      const cached = empleadosCache.find(e => e.id === id);
      if (cached) return cached;
    }
    return fetchApi(`/empleados/${id}`);
  },
  
  create: async (data: Omit<Empleado, 'id'>): Promise<Empleado> => {
    const res = await fetchApi('/empleados', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    empleadosCache = null; // Invalida el caché
    notifyEmpleadosChanged();
    return res;
  },
    
  update: async (id: number, data: Partial<Empleado>): Promise<Empleado> => {
    const res = await fetchApi(`/empleados/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    empleadosCache = null; // Invalida el caché
    notifyEmpleadosChanged();
    return res;
  },
    
  delete: async (id: number, options?: { deleteUsers?: boolean }): Promise<void> => {
    const params = options?.deleteUsers ? '?deleteUsers=true' : '';
    await fetchApi(`/empleados/${id}${params}`, {
      method: 'DELETE',
    });
    if (empleadosCache) {
      empleadosCache = empleadosCache.filter(e => e.id !== id);
    }
    notifyEmpleadosChanged();
  },
};
