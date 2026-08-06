import { useEffect, useState, useRef } from 'react';
import { reportsService } from '../services/reports.service';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PageHeader, Tabs, TableWrap, Th, Td, ChartCard, Badge, Card, Button } from '../components/ui';
import { ORDER_STATUS_LABEL } from '../utils/orderStatus';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#64748b'];

type ReportTab = 'stock' | 'orders' | 'costs' | 'import';

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('stock');
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

  const pieData = orderData?.byStatus?.map((s: any) => ({ name: ORDER_STATUS_LABEL[s.status] || s.status, value: Number(s.count) })) || [];

  return (
    <div>
      <PageHeader title="Relatórios" />

      <div style={{ marginBottom: 18 }}>
        <Tabs
          tabs={[
            { key: 'stock', label: 'Estoque' },
            { key: 'orders', label: 'Pedidos' },
            { key: 'costs', label: 'Custos' },
            { key: 'import', label: 'Importar Excel' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'stock' && (
        <TableWrap>
          <thead>
            <tr>
              {['SKU', 'Produto', 'Categoria', 'Estoque Atual', 'Estoque Mín.', 'Unidade', 'Custo Unit.', 'Status'].map(h => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stockData.map((p: any) => (
              <tr key={p.id}>
                <Td data-label="SKU"><Badge tone="primary">{p.sku}</Badge></Td>
                <Td data-label="Produto">{p.name}</Td>
                <Td data-label="Categoria">{p.category || '—'}</Td>
                <Td data-label="Estoque" style={{ fontWeight: 700 }}>{p.currentStock}</Td>
                <Td data-label="Mín.">{p.minimumStock}</Td>
                <Td data-label="Unidade">{p.unit}</Td>
                <Td data-label="Custo">R$ {Number(p.costPrice).toFixed(2)}</Td>
                <Td data-label="Status">
                  {p.currentStock <= p.minimumStock && p.minimumStock > 0
                    ? <Badge tone="danger">⚠️ Crítico</Badge>
                    : <Badge tone="success">✓ Normal</Badge>}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {tab === 'orders' && (
        <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          <ChartCard title="Distribuição por Status">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <TableWrap>
            <thead>
              <tr>
                {['Pedido', 'Fornecedor', 'Status', 'Valor', 'Criado em'].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {(orderData?.orders || []).map((o: any) => (
                <tr key={o.id}>
                  <Td data-label="Pedido"><Badge tone="primary">{o.orderNumber}</Badge></Td>
                  <Td data-label="Fornecedor">{o.supplier}</Td>
                  <Td data-label="Status">{ORDER_STATUS_LABEL[o.status]}</Td>
                  <Td data-label="Valor">{o.currency} {Number(o.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                  <Td data-label="Criado em">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}

      {tab === 'costs' && (
        <TableWrap>
          <thead>
            <tr>
              {['Pedido', 'Fornecedor', 'Valor Pedido', 'Custo Total (BRL)', '# Custos'].map(h => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {costData.map((o: any) => (
              <tr key={o.id}>
                <Td data-label="Pedido"><Badge tone="primary">{o.orderNumber}</Badge></Td>
                <Td data-label="Fornecedor">{o.supplier}</Td>
                <Td data-label="Valor">{o.currency} {Number(o.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                <Td data-label="Total BRL" style={{ fontWeight: 700 }}>R$ {Number(o.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                <Td data-label="# Custos">{o.costs?.length}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {tab === 'import' && (
        <Card style={{ maxWidth: 560, textAlign: 'center', padding: '48px' }}>
          <div style={styles.importIcon}>📂</div>
          <h2 style={styles.importTitle}>Importar Produtos via Excel</h2>
          <p style={styles.importDesc}>Selecione um arquivo <code>.xlsx</code> com os produtos. O sistema reconhece automaticamente as colunas: <strong>sku/codigo, nome/descricao/produto, fornecedor, origem, unidade, preco_custo, preco_venda, estoque, estoque_minimo, categoria, ncm</strong>.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
          <Button onClick={() => fileRef.current?.click()} disabled={importing} style={{ padding: '12px 28px', fontSize: 15 }}>
            {importing ? 'Importando...' : '📤 Selecionar Arquivo Excel'}
          </Button>
        </Card>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  importIcon: { fontSize: 52, marginBottom: 16 },
  importTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 },
  importDesc: { color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 28 },
};
