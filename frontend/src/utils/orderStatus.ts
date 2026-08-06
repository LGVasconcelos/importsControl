import type { BadgeTone } from '../components/ui/Badge';

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_TRANSIT: 'Em Trânsito',
  CUSTOMS: 'Desembaraço',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

export const ORDER_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: 'neutral',
  CONFIRMED: 'primary',
  IN_TRANSIT: 'warning',
  CUSTOMS: 'info',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING: '#64748b',
  CONFIRMED: '#2563eb',
  IN_TRANSIT: '#d97706',
  CUSTOMS: '#7c3aed',
  RECEIVED: '#16a34a',
  CANCELLED: '#dc2626',
};
