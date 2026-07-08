import api from './api';

export interface MlStatus {
  connected: boolean;
  nickname?: string;
  mlUserId?: string;
}

export interface MlVariation {
  id: string;
  attributes: string;
  code: string;
}

export interface MlListingStatus {
  entry: string;
  itemId: string;
  variationId?: string;
  status: string;
  mlStock: number;
  localStock: number;
  divergence: boolean;
}

export interface MlDivergence {
  sku: string;
  productId: number;
  divergences: { entry: string; mlStock: number; localStock: number }[];
}

export interface MlSalesSummary {
  totalRevenue: number;
  totalOrders: number;
  totalFees: number;
  netRevenue: number;
  orders: { id: string; date: string; total: number; fee: number; net: number; items: { title: string; quantity: number; unitPrice: number }[] }[];
}

export const mercadolivreService = {
  getStatus: () => api.get<MlStatus>('/mercadolivre/status').then(r => r.data),
  disconnect: () => api.delete('/mercadolivre/disconnect').then(r => r.data),
  syncAll: () => api.post<{ synced: number; skipped: number; errors: string[] }>('/mercadolivre/sync-stock').then(r => r.data),
  syncProduct: (productId: number) => api.post<{ ok: boolean; message: string }>(`/mercadolivre/sync-stock/${productId}`).then(r => r.data),
  syncProductWithAutoPause: (productId: number) => api.post<{ ok: boolean; message: string }>(`/mercadolivre/sync-stock/${productId}/auto`).then(r => r.data),
  autoLink: () => api.post<{ linked: number; skipped: number; notFound: string[]; debug: string[] }>('/mercadolivre/auto-link').then(r => r.data),
  getVariations: (itemId: string) => api.get<MlVariation[]>(`/mercadolivre/items/${itemId}/variations`).then(r => r.data),
  getListingStatus: (productId: number) => api.get<MlListingStatus[]>(`/mercadolivre/listing-status/${productId}`).then(r => r.data),
  getDivergences: () => api.get<MlDivergence[]>('/mercadolivre/divergences').then(r => r.data),
  processPendingSales: () => api.post<{ processed: number; skipped: number; errors: string[] }>('/mercadolivre/process-pending-sales').then(r => r.data),
  getSalesSummary: (from?: string, to?: string) =>
    api.get<MlSalesSummary>('/mercadolivre/sales-summary', { params: { from, to } }).then(r => r.data),
};
