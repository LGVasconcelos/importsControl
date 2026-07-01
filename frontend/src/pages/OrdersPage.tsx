import { useEffect, useState } from 'react';
import { ordersService } from '../services/orders.service';
import type { Order, OrderStatus, OrderItem } from '../services/orders.service';
import { productsService } from '../services/products.service';
import type { Product } from '../services/products.service';
import toast from 'react-hot-toast';

const CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'BRL'];

const statusLabel: Record<OrderStatus, string> = {
  PENDING: 'Pendente', CONFIRMED: 'Confirmado', IN_TRANSIT: 'Em Trânsito',
  CUSTOMS: 'Desembaraço', RECEIVED: 'Recebido', CANCELLED: 'Cancelado',
};
const statusColor: Record<OrderStatus, string> = {
  PENDING: '#64748b', CONFIRMED: '#2563eb', IN_TRANSIT: '#d97706',
  CUSTOMS: '#7c3aed', RECEIVED: '#16a34a', CANCELLED: '#dc2626',
};

const toDateInput = (v?: string) => (v ? v.split('T')[0] : '');

const emptyForm: Partial<Order> = {
  orderNumber: '', supplier: '', origin: '', status: 'PENDING',
  orderDate: '', expectedArrival: '', totalValue: 0, currency: 'USD', exchangeRate: 1,
  invoiceNumber: '', trackingCode: '', notes: '',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Order>>(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingInput, setTrackingInput] = useState('');
  const [items, setItems] = useState<Omit<OrderItem, 'id'>[]>([]);
  const [itemDraft, setItemDraft] = useState({ productId: 0, quantity: 1, unitPrice: 0 });
  const [fetchingRate, setFetchingRate] = useState(false);

  const fetchExchangeRate = async (currency: string) => {
    if (currency === 'BRL') { setForm(f => ({ ...f, currency, exchangeRate: 1 })); return; }
    setFetchingRate(true);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/USD`);
      const data = await res.json();
      // rates.BRL = quantos BRL por 1 USD
      // rates[currency] = quantas unidades da moeda por 1 USD
      // Cruzamento: 1 currency = (rates.BRL / rates[currency]) BRL
      const brlPerUsd = data.rates?.BRL;
      const currPerUsd = data.rates?.[currency];
      if (brlPerUsd && currPerUsd && currPerUsd > 0) {
        const rate = brlPerUsd / currPerUsd;
        setForm(f => ({ ...f, currency, exchangeRate: Number(rate.toFixed(4)) }));
        toast.success(`Taxa: 1 ${currency} = R$ ${rate.toFixed(4)}`, { duration: 2500 });
      } else {
        setForm(f => ({ ...f, currency }));
      }
    } catch {
      setForm(f => ({ ...f, currency }));
    } finally {
      setFetchingRate(false);
    }
  };

  // Padrão de rastreio postal internacional: 2 letras + 9 dígitos + 2 letras (ex: NN287151109BR)
  const TRACKING_RE = /[A-Z]{2}\d{9}[A-Z]{2}/g;
  const parseCodes = (v?: string): string[] => {
    if (!v) return [];
    // Se contém vírgula, usa separação por vírgula
    if (v.includes(',')) return v.split(',').map(s => s.trim()).filter(Boolean);
    // Se parece múltiplos códigos concatenados, extrai pelo padrão
    const matches = v.match(TRACKING_RE);
    if (matches && matches.length > 1) return matches;
    return v.trim() ? [v.trim()] : [];
  };

  const load = () => { setLoading(true); ordersService.getAll().then(setOrders).finally(() => setLoading(false)); };
  useEffect(() => {
    load();
    productsService.getAll().then(setProducts);
  }, []);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setTrackingInput(''); setItems([]); setItemDraft({ productId: 0, quantity: 1, unitPrice: 0 }); setModal(true); };
  const openEdit = (o: Order) => {
    setForm({
      ...o,
      orderDate: toDateInput(o.orderDate),
      expectedArrival: toDateInput(o.expectedArrival),
      actualArrival: toDateInput(o.actualArrival),
      totalValue: Number(o.totalValue),
      exchangeRate: Number(o.exchangeRate),
    });
    setItems((o.items || []).map(i => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice), notes: i.notes || '' })));
    setItemDraft({ productId: 0, quantity: 1, unitPrice: 0 });
    setTrackingInput('');
    setEditing(o.id);
    setModal(true);
  };

  const addItem = () => {
    if (!itemDraft.productId) { toast.error('Selecione um produto'); return; }
    if (itemDraft.quantity <= 0) { toast.error('Quantidade deve ser maior que zero'); return; }
    setItems(prev => [...prev, { productId: itemDraft.productId, quantity: itemDraft.quantity, unitPrice: itemDraft.unitPrice, totalPrice: itemDraft.quantity * itemDraft.unitPrice, notes: '' }]);
    setItemDraft({ productId: 0, quantity: 1, unitPrice: 0 });
  };

  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const addTrackingCode = () => {
    const raw = trackingInput.trim();
    if (!raw) return;
    // Detecta múltiplos códigos colados de uma vez
    const newCodes = raw.includes(',') ? raw.split(',').map(s => s.trim()).filter(Boolean)
      : (raw.match(TRACKING_RE) ?? [raw]);
    const existing = parseCodes(form.trackingCode);
    const toAdd = newCodes.filter(c => !existing.includes(c));
    if (!toAdd.length) { toast.error('Código(s) já adicionado(s)'); return; }
    setForm(f => ({ ...f, trackingCode: [...existing, ...toAdd].join(', ') }));
    setTrackingInput('');
    if (toAdd.length > 1) toast.success(`${toAdd.length} códigos adicionados`);
  };

  const removeTrackingCode = (code: string) => {
    const codes = parseCodes(form.trackingCode).filter(c => c !== code);
    setForm(f => ({ ...f, trackingCode: codes.join(', ') }));
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, totalValue: Number(form.totalValue), exchangeRate: Number(form.exchangeRate), items };
      if (editing) await ordersService.update(editing, payload);
      else await ordersService.create(payload);
      toast.success(editing ? 'Pedido atualizado!' : 'Pedido criado!');
      setModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este pedido?')) return;
    await ordersService.remove(id);
    toast.success('Pedido removido');
    load();
  };

  const handleStatusChange = async (id: number, status: OrderStatus) => {
    try {
      await ordersService.update(id, { status });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast.success('Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Pedidos de Importação</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={async () => { try { const r = await ordersService.syncCosts(); toast.success(`Custos sincronizados: ${r.synced} criados, ${r.skipped} já existiam`); } catch { toast.error('Erro ao sincronizar custos'); } }} style={styles.btnSync}>Sincronizar Custos</button>
          <button onClick={async () => { try { const r = await ordersService.fixTracking(); toast.success(`Rastreios corrigidos: ${r.fixed}`); load(); } catch { toast.error('Erro ao corrigir rastreios'); } }} style={styles.btnSync}>Corrigir Rastreios</button>
          <button onClick={openCreate} style={styles.btnPrimary}>+ Novo Pedido</button>
        </div>
      </div>
      <div style={styles.toolbar}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={styles.filterSelect}>
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div style={styles.tableWrap}>
        {loading ? <div style={styles.loading}>Carregando...</div> : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              {['Nº Pedido', 'Fornecedor', 'Origem', 'Status', 'Data Pedido', 'Prev. Chegada', 'Valor Total', 'Produtos', 'Rastreio', 'Ações'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} style={styles.tr}>
                <td style={styles.td}><span style={styles.sku}>{o.orderNumber}</span></td>
                <td style={styles.td}>{o.supplier}</td>
                <td style={styles.td}>{o.origin || '—'}</td>
                <td style={styles.td}>
                  <select
                    value={o.status}
                    onChange={e => handleStatusChange(o.id, e.target.value as OrderStatus)}
                    style={{ ...styles.statusSelect, color: statusColor[o.status], borderColor: statusColor[o.status] + '80', background: statusColor[o.status] + '18' }}
                  >
                    {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td style={styles.td}>{toDateInput(o.orderDate) || '—'}</td>
                <td style={styles.td}>{toDateInput(o.expectedArrival) || '—'}</td>
                <td style={styles.td}>{o.currency} {Number(o.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style={styles.td}>
                  {o.items?.length
                    ? <span style={styles.itemsBadge}>{o.items.length} {o.items.length === 1 ? 'produto' : 'produtos'}</span>
                    : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
                </td>
                <td style={styles.td}>
                  {parseCodes(o.trackingCode).length > 0
                    ? parseCodes(o.trackingCode).map(c => (
                        <span key={c} style={styles.trackChip}>{c}</span>
                      ))
                    : '—'}
                </td>
                <td style={styles.td}>
                  <button onClick={() => openEdit(o)} style={styles.btnEdit}>Editar</button>
                  <button onClick={() => handleDelete(o.id)} style={styles.btnDel}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
        {!loading && filtered.length === 0 && <div style={styles.empty}>Nenhum pedido encontrado.</div>}
      </div>

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>{editing ? 'Editar Pedido' : 'Novo Pedido'}</h2>
            <div style={styles.grid2}>
              <div style={styles.field}><label style={styles.label}>Nº do Pedido *</label><input value={form.orderNumber || ''} onChange={e => setForm(f => ({ ...f, orderNumber: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Fornecedor *</label><input value={form.supplier || ''} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Origem</label><input value={form.origin || ''} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}>
                <label style={styles.label}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as OrderStatus }))} style={styles.input}>
                  {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={styles.field}><label style={styles.label}>Data do Pedido</label><input type="date" value={form.orderDate || ''} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Previsão de Chegada</label><input type="date" value={form.expectedArrival || ''} onChange={e => setForm(f => ({ ...f, expectedArrival: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Data Chegada Real</label><input type="date" value={form.actualArrival || ''} onChange={e => setForm(f => ({ ...f, actualArrival: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Valor Total</label><input type="number" value={form.totalValue || 0} onChange={e => setForm(f => ({ ...f, totalValue: Number(e.target.value) }))} style={styles.input} /></div>
              <div style={styles.field}>
                <label style={styles.label}>Moeda</label>
                <select value={form.currency || 'USD'} onChange={e => fetchExchangeRate(e.target.value)} style={styles.input}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Taxa de Câmbio {fetchingRate && <span style={{ fontWeight: 400, color: '#2563eb' }}>(buscando...)</span>}</label>
                <input type="number" step="0.0001" value={form.exchangeRate || 1} onChange={e => setForm(f => ({ ...f, exchangeRate: Number(e.target.value) }))} style={styles.input} />
              </div>
              <div style={styles.field}><label style={styles.label}>Nº da Invoice</label><input value={form.invoiceNumber || ''} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} style={styles.input} /></div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Códigos de Rastreio</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTrackingCode(); } }}
                  placeholder="Digite o código e pressione Enter ou clique em Adicionar"
                  style={{ ...styles.input, flex: 1 }}
                />
                <button type="button" onClick={addTrackingCode} style={styles.btnAdd}>Adicionar</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {parseCodes(form.trackingCode).map(c => (
                  <span key={c} style={styles.trackChipEdit}>
                    {c}
                    <button type="button" onClick={() => removeTrackingCode(c)} style={styles.trackRemove}>×</button>
                  </span>
                ))}
              </div>
            </div>
            <div style={styles.field}><label style={styles.label}>Observações</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...styles.input, height: 70, resize: 'vertical' }} /></div>

            {/* Itens do Pedido */}
            <div style={{ marginTop: 20 }}>
              <div style={styles.sectionDivider}>Itens do Pedido</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div style={styles.field}>
                  <label style={styles.label}>Produto *</label>
                  <select value={itemDraft.productId} onChange={e => { const p = products.find(x => x.id === Number(e.target.value)); setItemDraft(d => ({ ...d, productId: Number(e.target.value), unitPrice: p ? Number(p.costPrice) : d.unitPrice })); }} style={styles.input}>
                    <option value={0}>Selecione...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Quantidade</label>
                  <input type="number" min={0.001} step={0.001} value={itemDraft.quantity} onChange={e => setItemDraft(d => ({ ...d, quantity: Number(e.target.value) }))} style={styles.input} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Preço Unit.</label>
                  <input type="number" min={0} step={0.01} value={itemDraft.unitPrice} onChange={e => setItemDraft(d => ({ ...d, unitPrice: Number(e.target.value) }))} style={styles.input} />
                </div>
                <button type="button" onClick={addItem} style={{ ...styles.btnAdd, alignSelf: 'flex-end' }}>+ Adicionar</button>
              </div>
              {items.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 4 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-thead)' }}>
                      <th style={styles.itemTh}>Produto</th>
                      <th style={{ ...styles.itemTh, textAlign: 'right' }}>Qtd</th>
                      <th style={{ ...styles.itemTh, textAlign: 'right' }}>Preço Unit.</th>
                      <th style={{ ...styles.itemTh, textAlign: 'right' }}>Total</th>
                      <th style={styles.itemTh}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const prod = products.find(p => p.id === item.productId);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-row)' }}>
                          <td style={styles.itemTd}>{prod ? `${prod.name} (${prod.sku})` : `ID ${item.productId}`}</td>
                          <td style={{ ...styles.itemTd, textAlign: 'right' }}>{Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                          <td style={{ ...styles.itemTd, textAlign: 'right' }}>{Number(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td style={{ ...styles.itemTd, textAlign: 'right', fontWeight: 700 }}>{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td style={{ ...styles.itemTd, textAlign: 'center' }}>
                            <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, fontWeight: 700 }}>×</button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: 'var(--bg-thead)' }}>
                      <td colSpan={3} style={{ ...styles.itemTd, fontWeight: 700, textAlign: 'right' }}>Total dos Itens:</td>
                      <td style={{ ...styles.itemTd, textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                        {items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              )}
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' },
  toolbar: { marginBottom: 16 },
  filterSelect: { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-body)', cursor: 'pointer' },
  statusSelect: { padding: '4px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1.5px solid', cursor: 'pointer', outline: 'none' },
  loading: { padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' },
  tableWrap: { background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg-thead)' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border-row)' },
  td: { padding: '11px 14px', fontSize: 13, color: 'var(--text-body)' },
  sku: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' },
  btnPrimary: { padding: '9px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnSync: { padding: '9px 18px', background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnEdit: { marginRight: 6, padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnDel: { padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-body)' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  itemsBadge: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 },
  sectionDivider: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 },
  itemTh: { padding: '6px 8px', textAlign: 'left' as const, color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' },
  itemTd: { padding: '6px 8px', color: 'var(--text-body)' },
  trackChipEdit: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  trackRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: 700, fontSize: 14, lineHeight: 1, padding: 0 },
  btnAdd: { padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' },
  btnCancel: { padding: '9px 18px', background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
