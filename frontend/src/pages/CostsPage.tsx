import { useEffect, useState } from 'react';
import { costsService } from '../services/costs.service';
import type { Cost } from '../services/costs.service';
import { ordersService } from '../services/orders.service';
import type { Order } from '../services/orders.service';
import { mercadolivreService } from '../services/mercadolivre.service';
import type { MlSalesSummary } from '../services/mercadolivre.service';
import toast from 'react-hot-toast';

const COST_TYPES = ['Frete Internacional', 'Frete Nacional', 'Imposto de Importação (II)', 'IPI', 'ICMS', 'PIS/COFINS', 'Despachante', 'Armazenagem', 'Seguro', 'Outros'];

export default function CostsPage() {
  const [tab, setTab] = useState<'costs' | 'balance'>('costs');
  const [costs, setCosts] = useState<Cost[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Cost>>({ orderId: 0, description: '', value: 0, currency: 'BRL', exchangeRate: 1, costType: '', notes: '' });

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

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este custo?')) return;
    await costsService.remove(id);
    toast.success('Custo removido');
    load();
  };

  const totalBrl = costs.reduce((s, c) => s + Number(c.valueInBrl || c.value), 0);
  const balance = salesSummary ? salesSummary.totalRevenue - totalBrl : null;

  return (
    <div>
      <div style={styles.header} className="page-header">
        <div>
          <h1 style={styles.title}>Custos de Importação</h1>
          <p style={styles.total}>Total acumulado: <strong>R$ {totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
        </div>
        {tab === 'costs' && <button onClick={() => setModal(true)} style={styles.btnPrimary}>+ Novo Custo</button>}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setTab('costs')} style={tab === 'costs' ? styles.tabActive : styles.tab}>Custos</button>
        <button onClick={() => setTab('balance')} style={tab === 'balance' ? styles.tabActive : styles.tab}>Balanço</button>
      </div>

      {/* Costs tab */}
      {tab === 'costs' && (
        <div style={styles.tableWrap} className="responsive-table-wrap">
          <table style={styles.table} className="responsive-table">
            <thead>
              <tr style={styles.thead}>
                {['Pedido', 'Descrição', 'Tipo', 'Valor', 'Moeda', 'Taxa', 'Valor BRL', 'Observação', 'Ações'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.map(c => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td} data-label="Pedido"><span style={styles.sku}>{c.order?.orderNumber || `#${c.orderId}`}</span></td>
                  <td style={styles.td} data-label="Descrição">{c.description}</td>
                  <td style={styles.td} data-label="Tipo">{c.costType || '—'}</td>
                  <td style={styles.td} data-label="Valor">{Number(c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={styles.td} data-label="Moeda">{c.currency}</td>
                  <td style={styles.td} data-label="Taxa">{Number(c.exchangeRate).toFixed(4)}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }} data-label="Valor BRL">R$ {Number(c.valueInBrl || c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={styles.td} data-label="Obs.">{c.notes || '—'}</td>
                  <td style={styles.td} data-label=""><button onClick={() => handleDelete(c.id)} style={styles.btnDel}>Remover</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <div style={styles.empty}>Carregando...</div> : costs.length === 0 && <div style={styles.empty}>Nenhum custo registrado.</div>}
        </div>
      )}

      {/* Balance tab */}
      {tab === 'balance' && (
        <div style={styles.balanceWrap}>
          {/* Filters */}
          <div style={styles.balanceFilters}>
            <div style={styles.field}>
              <label style={styles.label}>Data inicial</label>
              <input type="date" value={balanceDateFrom} onChange={e => setBalanceDateFrom(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Data final</label>
              <input type="date" value={balanceDateTo} onChange={e => setBalanceDateTo(e.target.value)} style={styles.input} />
            </div>
            <button onClick={loadBalance} style={{ ...styles.btnPrimary, alignSelf: 'flex-end' }}>Calcular</button>
          </div>

          {balanceLoading && <div style={styles.empty}>Buscando vendas no Mercado Livre...</div>}
          {balanceError && <div style={{ ...styles.empty, color: '#dc2626' }}>{balanceError}</div>}

          {!balanceLoading && !balanceError && salesSummary && (
            <>
              {/* Summary cards */}
              <div style={styles.balanceCards}>
                <div style={{ ...styles.card, borderTop: '3px solid #16a34a' }}>
                  <div style={styles.cardLabel}>Entrada (Vendas ML)</div>
                  <div style={{ ...styles.cardValue, color: '#16a34a' }}>
                    R$ {salesSummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={styles.cardSub}>{salesSummary.totalOrders} pedido(s) pago(s)</div>
                </div>
                <div style={{ ...styles.card, borderTop: '3px solid #dc2626' }}>
                  <div style={styles.cardLabel}>Saída (Custos de Importação)</div>
                  <div style={{ ...styles.cardValue, color: '#dc2626' }}>
                    R$ {totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={styles.cardSub}>{costs.length} custo(s) registrado(s)</div>
                </div>
                <div style={{ ...styles.card, borderTop: `3px solid ${balance !== null && balance >= 0 ? '#2563eb' : '#f59e0b'}` }}>
                  <div style={styles.cardLabel}>Balanço (Entrada − Saída)</div>
                  <div style={{ ...styles.cardValue, color: balance !== null && balance >= 0 ? '#2563eb' : '#f59e0b' }}>
                    R$ {balance !== null ? balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                  </div>
                  {salesSummary.totalFees > 0 && (
                    <div style={styles.cardSub}>Taxas ML: R$ {salesSummary.totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  )}
                </div>
              </div>

              {/* Orders detail */}
              {salesSummary.orders.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Pedidos Mercado Livre</h3>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thead}>
                          {['Pedido ML', 'Data', 'Itens', 'Total'].map(h => <th key={h} style={styles.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {salesSummary.orders.map(o => (
                          <tr key={o.id} style={styles.tr}>
                            <td style={styles.td}><span style={styles.sku}>#{o.id}</span></td>
                            <td style={styles.td}>{new Date(o.date).toLocaleDateString('pt-BR')}</td>
                            <td style={styles.td}>{o.items.map(i => `${i.quantity}× ${i.title}`).join(', ') || '—'}</td>
                            <td style={{ ...styles.td, fontWeight: 700, color: '#16a34a' }}>R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Novo Custo</h2>
            <div style={styles.fields}>
              <div style={styles.field}><label style={styles.label}>Pedido *</label>
                <select value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: Number(e.target.value) }))} style={styles.input}>
                  <option value={0}>Selecione...</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} — {o.supplier}</option>)}
                </select>
              </div>
              <div style={styles.field}><label style={styles.label}>Descrição *</label><input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Tipo de Custo</label>
                <select value={form.costType || ''} onChange={e => setForm(f => ({ ...f, costType: e.target.value }))} style={styles.input}>
                  <option value="">Selecione...</option>
                  {COST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={styles.field}><label style={styles.label}>Valor *</label><input type="number" step="0.01" value={form.value || 0} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Moeda</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={styles.input}>
                  {['BRL', 'USD', 'EUR', 'CNY', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.field}><label style={styles.label}>Taxa de Câmbio</label><input type="number" step="0.0001" value={form.exchangeRate || 1} onChange={e => setForm(f => ({ ...f, exchangeRate: Number(e.target.value) }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Observação</label><input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={styles.input} /></div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setModal(false)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={handleSave} style={styles.btnPrimary}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 },
  total: { fontSize: 14, color: 'var(--text-secondary)' },
  tabs: { display: 'flex', gap: 4, marginBottom: 18, borderBottom: '2px solid var(--border)' },
  tab: { padding: '8px 20px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', marginBottom: -2, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' },
  tabActive: { padding: '8px 20px', background: 'transparent', border: 'none', borderBottom: '2px solid #2563eb', marginBottom: -2, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#2563eb' },
  tableWrap: { background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow)', overflowY: 'auto', overflowX: 'auto', maxHeight: 'calc(100vh - 260px)', minHeight: 200 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg-thead)' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-thead)', zIndex: 1 },
  tr: { borderBottom: '1px solid var(--border-row)' },
  td: { padding: '11px 14px', fontSize: 13, color: 'var(--text-body)' },
  sku: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' },
  btnPrimary: { padding: '9px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnDel: { padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 },
  fields: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-body)' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  btnCancel: { padding: '9px 18px', background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  balanceWrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  balanceFilters: { display: 'flex', gap: 14, alignItems: 'flex-end', background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 12, boxShadow: 'var(--shadow)', flexWrap: 'wrap' },
  balanceCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  card: { background: 'var(--bg-card)', borderRadius: 12, padding: '20px 24px', boxShadow: 'var(--shadow)' },
  cardLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 },
  cardValue: { fontSize: 26, fontWeight: 800, marginBottom: 4 },
  cardSub: { fontSize: 12, color: 'var(--text-secondary)' },
};
