import api from './api';

export interface Product {
  id: number; sku: string; name: string; description?: string;
  origin?: string; supplier?: string; unit: string;
  costPrice: number; salePrice: number;
  currentStock: number; minimumStock: number;
  active: boolean; category?: string; ncm?: string;
  mlItemId?: string;
  isKit: boolean;
  createdAt: string; updatedAt: string;
}

export interface KitItem {
  id: number;
  kitProductId: number;
  componentProductId: number;
  quantity: number;
  component: Product;
}

export const productsService = {
  getAll: (search?: string) => api.get<Product[]>('/products', { params: search ? { search } : {} }).then(r => r.data),
  getOne: (id: number) => api.get<Product>(`/products/${id}`).then(r => r.data),
  getLowStock: () => api.get<Product[]>('/products/low-stock').then(r => r.data),
  create: (data: Partial<Product>) => api.post<Product>('/products', data).then(r => r.data),
  update: (id: number, data: Partial<Product>) => api.put<Product>(`/products/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/products/${id}`).then(r => r.data),
  getKitItems: (id: number) => api.get<KitItem[]>(`/products/${id}/kit-items`).then(r => r.data),
  addKitItem: (id: number, componentProductId: number, quantity: number) =>
    api.post<KitItem>(`/products/${id}/kit-items`, { componentProductId, quantity }).then(r => r.data),
  removeKitItem: (kitItemId: number) => api.delete(`/products/kit-items/${kitItemId}`).then(r => r.data),
};
