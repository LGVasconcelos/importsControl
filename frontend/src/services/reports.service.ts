import api from './api';

export interface DashboardData {
  totalProducts: number; lowStockProducts: number;
  ordersInTransit: number; ordersInCustoms: number; totalOrders: number;
  recentMovements: any[];
}

export interface ReorderSuggestion {
  productId: number;
  sku: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  incomingQty: number;
  avgDailySales: number;
  avgLeadTimeDays: number;
  daysUntilStockout: number | null;
  ruptureEpisodes90d: number;
  ruptureDaysTotal90d: number;
  isCurrentlyPaused: boolean;
  suggestedReorderQty: number;
}

export const reportsService = {
  getDashboard: () => api.get<DashboardData>('/reports/dashboard').then(r => r.data),
  getStock: () => api.get('/reports/stock').then(r => r.data),
  getMovements: (from?: string, to?: string) =>
    api.get('/reports/movements', { params: { from, to } }).then(r => r.data),
  getCosts: () => api.get('/reports/costs').then(r => r.data),
  getOrders: () => api.get('/reports/orders').then(r => r.data),
  getReorderSuggestions: () => api.get<ReorderSuggestion[]>('/reports/reorder-suggestions').then(r => r.data),
  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/import/excel', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
};
