import { useEffect, useState } from 'react';
import { reportsService } from '../services/reports.service';
import type { DashboardData } from '../services/reports.service';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PageHeader, StatCard, ChartCard, Badge, EmptyState } from '../components/ui';
import type { BadgeTone } from '../components/ui';
import { ORDER_STATUS_LABEL } from '../utils/orderStatus';

const movementTone: Record<string, BadgeTone> = {
  ENTRY: 'success',
  EXIT: 'danger',
  ADJUSTMENT: 'warning',
};

const movementLabel: Record<string, string> = {
  ENTRY: '▲ Entrada',
  EXIT: '▼ Saída',
  ADJUSTMENT: '⇄ Ajuste',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [orderStats, setOrderStats] = useState<{ status: string; count: string }[]>([]);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      reportsService.getDashboard().then(setData),
      reportsService.getOrders().then((r) => setOrderStats(r.byStatus)),
    ]).finally(() => setLoading(false));
  }, []);

  const cards = data ? [
    { label: 'Produtos Ativos', value: data.totalProducts, color: 'var(--color-primary)', icon: '📦' },
    { label: 'Estoque Crítico', value: data.lowStockProducts, color: 'var(--color-danger)', icon: '⚠️' },
    { label: 'Pedidos em Trânsito', value: data.ordersInTransit, color: 'var(--color-warning)', icon: '🚢' },
    { label: 'Em Desembaraço', value: data.ordersInCustoms, color: 'var(--color-info)', icon: '🛃' },
  ] : [];

  const chartData = orderStats.map(s => ({ name: ORDER_STATUS_LABEL[s.status] || s.status, total: Number(s.count) }));

  return (
    <div>
      <PageHeader title="Dashboard" />

      {loading && <EmptyState>Carregando...</EmptyState>}

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((c) => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />
        ))}
      </div>

      <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <ChartCard title="Pedidos por Status">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Últimas Movimentações">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data?.recentMovements || []).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <Badge tone={movementTone[m.type] || 'neutral'}>{movementLabel[m.type] || m.type}</Badge>
                <span style={{ flex: 1, color: 'var(--text-body)', fontWeight: 500 }}>{m.product?.name || '—'}</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{m.quantity} un</span>
              </div>
            ))}
            {(!data?.recentMovements?.length) && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Nenhuma movimentação ainda.</p>}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
