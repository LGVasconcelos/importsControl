import api from './api';

export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

export interface StockMovement {
  id: number; productId: number; product: { id: number; name: string; sku: string };
  type: MovementType; quantity: number; stockBefore: number; stockAfter: number;
  reason?: string; orderReference?: string; user?: { name: string };
  createdAt: string;
}

export const stockService = {
  getMovements: (productId?: number) =>
    api.get<StockMovement[]>('/stock/movements', { params: productId ? { productId } : {} }).then(r => r.data),
  createMovement: (data: { productId: number; type: MovementType; quantity: number; reason?: string; orderReference?: string }) =>
    api.post<StockMovement>('/stock/movement', data).then(r => r.data),
};
