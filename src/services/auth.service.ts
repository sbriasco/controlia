import { fetchApi } from './api';
import type { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  me: async (): Promise<User> => {
    return fetchApi('/auth/me');
  },
};
