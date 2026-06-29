import api from './api';

export interface Cost {
  id: number; orderId: number; order?: { orderNumber: string };
  description: string; value: number; currency: string;
  exchangeRate: number; valueInBrl?: number; costType?: string; notes?: string;
  createdAt: string;
}

export const costsService = {
  getAll: (orderId?: number) =>
    api.get<Cost[]>('/costs', { params: orderId ? { orderId } : {} }).then(r => r.data),
  getTotal: (orderId: number) =>
    api.get<{ orderId: number; totalBrl: number; costs: Cost[] }>(`/costs/order/${orderId}/total`).then(r => r.data),
  create: (data: Partial<Cost>) => api.post<Cost>('/costs', data).then(r => r.data),
  remove: (id: number) => api.delete(`/costs/${id}`).then(r => r.data),
};
