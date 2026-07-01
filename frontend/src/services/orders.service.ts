import api from './api';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'CUSTOMS' | 'RECEIVED' | 'CANCELLED';

export interface OrderItem {
  id?: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  product?: { id: number; name: string; sku: string; unit: string };
}

export interface Order {
  id: number; orderNumber: string; supplier: string; origin?: string;
  status: OrderStatus; orderDate?: string; expectedArrival?: string; actualArrival?: string;
  totalValue: number; currency: string; exchangeRate: number;
  invoiceNumber?: string; trackingCode?: string; notes?: string;
  items?: OrderItem[];
  user?: { name: string }; createdAt: string; updatedAt: string;
}

export const ordersService = {
  getAll: () => api.get<Order[]>('/orders').then(r => r.data),
  getOne: (id: number) => api.get<Order>(`/orders/${id}`).then(r => r.data),
  create: (data: Partial<Order>) => api.post<Order>('/orders', data).then(r => r.data),
  update: (id: number, data: Partial<Order>) => api.put<Order>(`/orders/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/orders/${id}`).then(r => r.data),
  syncCosts: (force = true) => api.post<{ synced: number; skipped: number }>('/orders/sync-costs', { force }).then(r => r.data),
};
