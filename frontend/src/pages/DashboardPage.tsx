import { useEffect, useState } from 'react';
import { reportsService } from '../services/reports.service';
import type { DashboardData } from '../services/reports.service';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente', CONFIRMED: 'Confirmado', IN_TRANSIT: 'Em Trânsito',
  CUSTOMS: 'Desembaraço', RECEIVED: 'Recebido', CANCELLED: 'Cancelado',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [orderStats, setOrderStats] = useState<{ status: string; count: string }[]>([]);

  useEffect(() => {
    reportsService.getDashboard().then(setData);
    reportsService.getOrders().then((r) => setOrderStats(r.byStatus));
  }, []);

  const cards = data ? [
    { label: 'Produtos Ativos', value: data.totalProducts, color: '#2563eb', icon: '📦' },
    { label: 'Estoque Crítico', value: data.lowStockProducts, color: '#dc2626', icon: '⚠️' },
    { label: 'Pedidos em Trânsito', value: data.ordersInTransit, color: '#d97706', icon: '🚢' },
    { label: 'Em Desembaraço', value: data.ordersInCustoms, color: '#7c3aed', icon: '🛃' },
  ] : [];

  const chartData = orderStats.map(s => ({ name: statusLabel[s.status] || s.status, total: Number(s.count) }));

  return (
    <div>
      <h1 style={styles.pageTitle}>Dashboard</h1>
      <div style={styles.cards}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...styles.card, borderTop: `4px solid ${c.color}` }}>
            <div style={styles.cardIcon}>{c.icon}</div>
            <div style={{ ...styles.cardValue, color: c.color }}>{c.value}</div>
            <div style={styles.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.row}>
        <div style={styles.chartBox}>
          <h2 style={styles.sectionTitle}>Pedidos por Status</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.movementsBox}>
          <h2 style={styles.sectionTitle}>Últimas Movimentações</h2>
          <div style={styles.movList}>
            {(data?.recentMovements || []).map((m: any) => (
              <div key={m.id} style={styles.movItem}>
                <span style={{ ...styles.badge, background: m.type === 'ENTRY' ? '#dcfce7' : m.type === 'EXIT' ? '#fee2e2' : '#fef9c3', color: m.type === 'ENTRY' ? '#16a34a' : m.type === 'EXIT' ? '#dc2626' : '#ca8a04' }}>
                  {m.type === 'ENTRY' ? '▲ Entrada' : m.type === 'EXIT' ? '▼ Saída' : '⇄ Ajuste'}
                </span>
                <span style={styles.movProduct}>{m.product?.name || '—'}</span>
                <span style={styles.movQty}>{m.quantity} un</span>
              </div>
            ))}
            {(!data?.recentMovements?.length) && <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhuma movimentação ainda.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 24 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 },
  card: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardValue: { fontSize: 32, fontWeight: 800, lineHeight: 1 },
  cardLabel: { fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 500 },
  row: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 },
  chartBox: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  movementsBox: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  movList: { display: 'flex', flexDirection: 'column', gap: 8 },
  movItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 },
  badge: { padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },
  movProduct: { flex: 1, color: '#374151', fontWeight: 500 },
  movQty: { color: '#64748b', fontWeight: 600 },
};
