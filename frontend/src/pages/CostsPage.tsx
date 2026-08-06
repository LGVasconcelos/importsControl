import { useEffect, useState } from 'react';
import { costsService } from '../services/costs.service';
import type { Cost } from '../services/costs.service';
import { ordersService } from '../services/orders.service';
import type { Order } from '../services/orders.service';
import { mercadolivreService } from '../services/mercadolivre.service';
import type { MlSalesSummary } from '../services/mercadolivre.service';
import toast from 'react-hot-toast';
import { Button, Badge, PageHeader, Modal, Tabs, TableWrap, Th, Td, Card, FormField, TextInput, Select, ConfirmDialog } from '../components/ui';

const COST_TYPES = ['Frete Internacional', 'Frete Nacional', 'Imposto de Importação (II)', 'IPI', 'ICMS', 'PIS/COFINS', 'Despachante', 'Armazenagem', 'Seguro', 'Outros'];

export default function CostsPage() {
  const [tab, setTab] = useState<'costs' | 'balance'>('costs');
  const [costs, setCosts] = useState<Cost[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Cost>>({ orderId: 0, description: '', value: 0, currency: 'BRL', exchangeRate: 1, costType: '', notes: '' });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); costsService.getAll().then(setCosts).finally(() => setLoading(false)); };
  useEffect(() => {
    load();
    ordersService.getAll().then(setOrders);
  }, []);

  // Balance tab state
  const [balanceDateFrom, setBalanceDateFrom] = useState('');
  const [balanceDateTo, setBalanceDateTo] = useState('');
  const [salesSummary, setSalesSummary] = useState<MlSalesSummary | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  const loadBalance = () => {
    setBalanceLoading(true);
    setBalanceError('');
    mercadolivreService.getSalesSummary(balanceDateFrom || undefined, balanceDateTo || undefined)
      .then(setSalesSummary)
      .catch((e: any) => setBalanceError(e?.response?.data?.message || e?.message || 'Erro ao buscar vendas'))
      .finally(() => setBalanceLoading(false));
  };

  useEffect(() => {
    if (tab === 'balance') loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleSave = async () => {
    if (!form.orderId) { toast.error('Selecione um pedido'); return; }
    try {
      const valueInBrl = form.currency !== 'BRL' ? (form.value || 0) * (form.exchangeRate || 1) : form.value;
      await costsService.create({ ...form, valueInBrl });
      toast.success('Custo registrado!');
      setModal(false);
      setForm({ orderId: 0, description: '', value: 0, currency: 'BRL', exchangeRate: 1, costType: '', notes: '' });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await costsService.remove(deleteId);
    toast.success('Custo removido');
    setDeleteId(null);
    load();
  };

  const totalBrl = costs.reduce((s, c) => s + Number(c.valueInBrl || c.value), 0);
  // Balanço usa o valor líquido recebido do ML (após taxas) menos os custos de importação
  const balance = salesSummary ? salesSummary.netRevenue - totalBrl : null;

  return (
    <div>
      <PageHeader
        title="Custos de Importação"
        subtitle={<>Total acumulado: <strong>R$ {totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></>}
        actions={tab === 'costs' && <Button onClick={() => setModal(true)}>+ Novo Custo</Button>}
      />

      {/* Tabs */}
      <div style={{ marginBottom: 18 }}>
        <Tabs
          tabs={[{ key: 'costs', label: 'Custos' }, { key: 'balance', label: 'Balanço' }]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* Costs tab */}
      {tab === 'costs' && (
        <>
          <TableWrap>
            <thead>
              <tr>
                {['Pedido', 'Descrição', 'Tipo', 'Valor', 'Moeda', 'Taxa', 'Valor BRL', 'Observação', 'Ações'].map(h => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.map(c => (
                <tr key={c.id}>
                  <Td data-label="Pedido"><Badge tone="primary">{c.order?.orderNumber || `#${c.orderId}`}</Badge></Td>
                  <Td data-label="Descrição">{c.description}</Td>
                  <Td data-label="Tipo">{c.costType || '—'}</Td>
                  <Td data-label="Valor">{Number(c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                  <Td data-label="Moeda">{c.currency}</Td>
                  <Td data-label="Taxa">{Number(c.exchangeRate).toFixed(4)}</Td>
                  <Td data-label="Valor BRL" style={{ fontWeight: 700 }}>R$ {Number(c.valueInBrl || c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                  <Td data-label="Obs.">{c.notes || '—'}</Td>
                  <Td data-label="">
                    <Button variant="danger" size="sm" onClick={() => setDeleteId(c.id)}>Remover</Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {loading ? <div style={styles.empty}>Carregando...</div> : costs.length === 0 && <div style={styles.empty}>Nenhum custo registrado.</div>}
        </>
      )}

      {/* Balance tab */}
      {tab === 'balance' && (
        <div style={styles.balanceWrap}>
          {/* Filters */}
          <div style={styles.balanceFilters}>
            <FormField label="Data inicial">
              <TextInput type="date" value={balanceDateFrom} onChange={e => setBalanceDateFrom(e.target.value)} />
            </FormField>
            <FormField label="Data final">
              <TextInput type="date" value={balanceDateTo} onChange={e => setBalanceDateTo(e.target.value)} />
            </FormField>
            <Button onClick={loadBalance} style={{ alignSelf: 'flex-end' }}>Calcular</Button>
          </div>

          {balanceLoading && <div style={styles.empty}>Buscando vendas no Mercado Livre...</div>}
          {balanceError && <div style={{ ...styles.empty, color: 'var(--color-danger)' }}>{balanceError}</div>}

          {!balanceLoading && !balanceError && salesSummary && (
            <>
              {/* Summary cards */}
              <div style={styles.balanceCards}>
                <Card accent="var(--color-success)">
                  <div style={styles.cardLabel}>Entrada (Líquido ML)</div>
                  <div style={{ ...styles.cardValue, color: 'var(--color-success)' }}>
                    R$ {salesSummary.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={styles.cardSub}>
                    {salesSummary.totalOrders} pedido(s) · bruto R$ {salesSummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · taxas ML R$ {salesSummary.totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </Card>
                <Card accent="var(--color-danger)">
                  <div style={styles.cardLabel}>Saída (Custos de Importação)</div>
                  <div style={{ ...styles.cardValue, color: 'var(--color-danger)' }}>
                    R$ {totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={styles.cardSub}>{costs.length} custo(s) registrado(s)</div>
                </Card>
                <Card accent={balance !== null && balance >= 0 ? 'var(--color-primary)' : 'var(--color-warning)'}>
                  <div style={styles.cardLabel}>Balanço (Entrada − Saída)</div>
                  <div style={{ ...styles.cardValue, color: balance !== null && balance >= 0 ? 'var(--color-primary)' : 'var(--color-warning)' }}>
                    R$ {balance !== null ? balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                  </div>
                  <div style={styles.cardSub}>Líquido ML − Custos de Importação</div>
                </Card>
              </div>

              {/* Orders detail */}
              {salesSummary.orders.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Pedidos Mercado Livre</h3>
                  <TableWrap maxHeight="none">
                    <thead>
                      <tr>
                        {['Pedido ML', 'Data', 'Itens', 'Bruto', 'Taxa ML', 'Líquido'].map(h => <Th key={h}>{h}</Th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {salesSummary.orders.map(o => (
                        <tr key={o.id}>
                          <Td data-label="Pedido ML"><Badge tone="primary">#{o.id}</Badge></Td>
                          <Td data-label="Data">{new Date(o.date).toLocaleDateString('pt-BR')}</Td>
                          <Td data-label="Itens">{o.items.map(i => `${i.quantity}× ${i.title}`).join(', ') || '—'}</Td>
                          <Td data-label="Bruto">R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                          <Td data-label="Taxa ML" style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: 12 }}>−R$ {o.fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                          <Td data-label="Líquido" style={{ fontWeight: 700, color: 'var(--color-success)' }}>R$ {o.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {modal && (
        <Modal
          title="Novo Custo"
          onClose={() => setModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Pedido *">
              <Select value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: Number(e.target.value) }))}>
                <option value={0}>Selecione...</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} — {o.supplier}</option>)}
              </Select>
            </FormField>
            <FormField label="Descrição *">
              <TextInput value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </FormField>
            <FormField label="Tipo de Custo">
              <Select value={form.costType || ''} onChange={e => setForm(f => ({ ...f, costType: e.target.value }))}>
                <option value="">Selecione...</option>
                {COST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Valor *">
              <TextInput type="number" step="0.01" value={form.value || 0} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Moeda">
              <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                {['BRL', 'USD', 'EUR', 'CNY', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Taxa de Câmbio">
              <TextInput type="number" step="0.0001" value={form.exchangeRate || 1} onChange={e => setForm(f => ({ ...f, exchangeRate: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Observação">
              <TextInput value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </FormField>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title="Remover custo?"
        description="Esta ação não pode ser desfeita. O custo será removido permanentemente."
        confirmLabel="Remover"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' },
  balanceWrap: { display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' },
  balanceFilters: { display: 'flex', gap: 14, alignItems: 'flex-end', background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 12, boxShadow: 'var(--shadow)', flexWrap: 'wrap' },
  balanceCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  cardLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 },
  cardValue: { fontSize: 26, fontWeight: 800, marginBottom: 4 },
  cardSub: { fontSize: 12, color: 'var(--text-secondary)' },
};
