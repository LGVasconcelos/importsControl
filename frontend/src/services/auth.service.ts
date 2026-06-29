import api from './api';

export interface LoginPayload { email: string; password: string; }
export interface AuthUser { id: number; name: string; email: string; role: string; }

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user as AuthUser;
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getUser(): AuthUser | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
};
