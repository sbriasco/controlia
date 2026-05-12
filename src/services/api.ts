export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.message || 'Error en la petición a la API') as any;
    if (errorData.errors) err.details = errorData.errors;
    throw err;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
};
