import api from './api';

export interface Product {
  id: number; sku: string; name: string; description?: string;
  origin?: string; supplier?: string; unit: string;
  costPrice: number; salePrice: number;
  currentStock: number; minimumStock: number;
  active: boolean; category?: string; ncm?: string;
  createdAt: string; updatedAt: string;
}

export const productsService = {
  getAll: (search?: string) => api.get<Product[]>('/products', { params: search ? { search } : {} }).then(r => r.data),
  getOne: (id: number) => api.get<Product>(`/products/${id}`).then(r => r.data),
  getLowStock: () => api.get<Product[]>('/products/low-stock').then(r => r.data),
  create: (data: Partial<Product>) => api.post<Product>('/products', data).then(r => r.data),
  update: (id: number, data: Partial<Product>) => api.put<Product>(`/products/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/products/${id}`).then(r => r.data),
};
