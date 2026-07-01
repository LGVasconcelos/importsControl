import api from './api';

export interface MlStatus {
  connected: boolean;
  nickname?: string;
  mlUserId?: string;
}

export const mercadolivreService = {
  getStatus: () => api.get<MlStatus>('/mercadolivre/status').then(r => r.data),
  disconnect: () => api.delete('/mercadolivre/disconnect').then(r => r.data),
  syncAll: () => api.post<{ synced: number; skipped: number; errors: string[] }>('/mercadolivre/sync-stock').then(r => r.data),
  syncProduct: (productId: number) => api.post<{ ok: boolean; message: string }>(`/mercadolivre/sync-stock/${productId}`).then(r => r.data),
};
