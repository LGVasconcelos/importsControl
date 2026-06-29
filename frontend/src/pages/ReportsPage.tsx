import { useEffect, useState, useRef } from 'react';
import { reportsService } from '../services/reports.service';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#64748b'];
const statusLabel: Record<string, string> = {
  PENDING: 'Pendente', CONFIRMED: 'Confirmado', IN_TRANSIT: 'Em Trânsito',
  CUSTOMS: 'Desembaraço', RECEIVED: 'Recebido', CANCELLED: 'Cancelado',
};

export default function ReportsPage() {
  const [tab, setTab] = useState<'stock' | 'orders' | 'costs' | 'import'>('stock');
  const [stockData, setStockData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any>(null);
  const [costData, setCostData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab === 'stock') reportsService.getStock().then(setStockData);
    if (tab === 'orders') reportsService.getOrders().then(setOrderData);
    if (tab === 'costs') reportsService.getCosts().then(setCostData);
  }, [tab]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await reportsService.importExcel(file);
      toast.success(`Importados: ${result.imported} | Ignorados: ${result.skipped}`);
      if (result.errors?.length) toast.error(`${result.errors.length} erros ao importar`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro na importação');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const pieData = orderData?.byStatus?.map((s: any) => ({ name: statusLabel[s.status] || s.status, value: Number(s.count) })) || [];

  return (
    <div>
      <h1 style={styles.title}>Relatórios</h1>
      <div style={styles.tabs}>
        {([['stock', 'Estoque'], ['orders', 'Pedidos'], ['costs', 'Custos'], ['import', 'Importar Excel']] as [typeof tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ ...styles.tab, ...(tab === key ? styles.activeTab : {}) }}>{label}</button>
        ))}
      </div>

      {tab === 'stock' && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr style={styles.thead}>{['SKU', 'Produto', 'Categoria', 'Estoque Atual', 'Estoque Mín.', 'Unidade', 'Custo Unit.', 'Status'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {stockData.map((p: any) => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}><span style={styles.sku}>{p.sku}</span></td>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}>{p.category || '—'}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{p.currentStock}</td>
                  <td style={styles.td}>{p.minimumStock}</td>
                  <td style={styles.td}>{p.unit}</td>
                  <td style={styles.td}>R$ {Number(p.costPrice).toFixed(2)}</td>
                  <td style={styles.td}>
                    {p.currentStock <= p.minimumStock && p.minimumStock > 0
                      ? <span style={styles.danger}>⚠️ Crítico</span>
                      : <span style={styles.ok}>✓ Normal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div style={styles.row}>
          <div style={styles.chartBox}>
            <h2 style={styles.sectionTitle}>Distribuição por Status</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr style={styles.thead}>{['Pedido', 'Fornecedor', 'Status', 'Valor', 'Criado em'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {(orderData?.orders || []).map((o: any) => (
                  <tr key={o.id} style={styles.tr}>
                    <td style={styles.td}><span style={styles.sku}>{o.orderNumber}</span></td>
                    <td style={styles.td}>{o.supplier}</td>
                    <td style={styles.td}>{statusLabel[o.status]}</td>
                    <td style={styles.td}>{o.currency} {Number(o.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={styles.td}>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'costs' && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr style={styles.thead}>{['Pedido', 'Fornecedor', 'Valor Pedido', 'Custo Total (BRL)', '# Custos'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {costData.map((o: any) => (
                <tr key={o.id} style={styles.tr}>
                  <td style={styles.td}><span style={styles.sku}>{o.orderNumber}</span></td>
                  <td style={styles.td}>{o.supplier}</td>
                  <td style={styles.td}>{o.currency} {Number(o.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>R$ {Number(o.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={styles.td}>{o.costs?.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'import' && (
        <div style={styles.importBox}>
          <div style={styles.importIcon}>📂</div>
          <h2 style={styles.importTitle}>Importar Produtos via Excel</h2>
          <p style={styles.importDesc}>Selecione um arquivo <code>.xlsx</code> com os produtos. O sistema reconhece automaticamente as colunas: <strong>sku/codigo, nome/descricao/produto, fornecedor, origem, unidade, preco_custo, preco_venda, estoque, estoque_minimo, categoria, ncm</strong>.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} style={styles.btnImport} disabled={importing}>
            {importing ? 'Importando...' : '📤 Selecionar Arquivo Excel'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 20 },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: { padding: '9px 18px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  activeTab: { background: '#2563eb', color: '#fff' },
  tableWrap: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '11px 14px', fontSize: 13, color: '#374151' },
  sku: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  danger: { color: '#dc2626', fontWeight: 600, fontSize: 12 },
  ok: { color: '#16a34a', fontWeight: 600, fontSize: 12 },
  row: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 },
  chartBox: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 },
  importBox: { background: '#fff', borderRadius: 14, padding: '48px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 560 },
  importIcon: { fontSize: 52, marginBottom: 16 },
  importTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12 },
  importDesc: { color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 28 },
  btnImport: { padding: '12px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 },
};
