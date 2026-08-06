import { useEffect, useState } from 'react';
import { ordersService } from '../services/orders.service';
import type { Order, OrderStatus, OrderItem } from '../services/orders.service';
import { productsService } from '../services/products.service';
import type { Product } from '../services/products.service';
import toast from 'react-hot-toast';
import {
  Button, Badge, PageHeader, Modal, TableWrap, Th, Td, Chip,
  FormField, TextInput, Select, Textarea, ConfirmDialog,
} from '../components/ui';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '../utils/orderStatus';

const CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'BRL'];

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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

  const requestDelete = (id: number) => setConfirmDeleteId(id);

  const handleDelete = async () => {
    if (confirmDeleteId == null) return;
    await ordersService.remove(confirmDeleteId);
    toast.success('Pedido removido');
    setConfirmDeleteId(null);
    load();
  };

  const handleStatusChange = async (id: number, status: OrderStatus) => {
    try {
      await ordersService.updateStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast.success(status === 'RECEIVED' ? 'Pedido recebido! Estoque atualizado.' : 'Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

  return (
    <div>
      <PageHeader
        title="Pedidos de Importação"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={async () => { try { const r = await ordersService.syncCosts(); toast.success(`Custos sincronizados: ${r.synced} criados, ${r.skipped} já existiam`); } catch { toast.error('Erro ao sincronizar custos'); } }}
            >
              Sincronizar Custos
            </Button>
            <Button
              variant="secondary"
              onClick={async () => { try { const r = await ordersService.fixTracking(); toast.success(`Rastreios corrigidos: ${r.fixed}`); load(); } catch { toast.error('Erro ao corrigir rastreios'); } }}
            >
              Corrigir Rastreios
            </Button>
            <Button onClick={openCreate}>+ Novo Pedido</Button>
          </>
        }
      />
      <div style={styles.toolbar}>
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Todos os status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      <TableWrap maxHeight="calc(100vh - 240px)">
        <thead>
          <tr>
            {['Nº Pedido', 'Fornecedor', 'Origem', 'Status', 'Data Pedido', 'Prev. Chegada', 'Valor Total', 'Produtos', 'Rastreio', 'Ações'].map(h => (
              <Th key={h}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={10} style={styles.loading}>Carregando...</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={10} style={styles.loading}>Nenhum pedido encontrado.</td></tr>
          ) : filtered.map(o => (
            <tr key={o.id}>
              <Td data-label="Nº Pedido"><Badge tone="primary">{o.orderNumber}</Badge></Td>
              <Td data-label="Fornecedor">{o.supplier}</Td>
              <Td data-label="Origem">{o.origin || '—'}</Td>
              <Td data-label="Status">
                <select
                  value={o.status}
                  onChange={e => handleStatusChange(o.id, e.target.value as OrderStatus)}
                  style={{ ...styles.statusSelect, color: ORDER_STATUS_COLOR[o.status], borderColor: ORDER_STATUS_COLOR[o.status] + '80', background: ORDER_STATUS_COLOR[o.status] + '18' }}
                >
                  {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Td>
              <Td data-label="Data Pedido">{toDateInput(o.orderDate) || '—'}</Td>
              <Td data-label="Prev. Chegada">{toDateInput(o.expectedArrival) || '—'}</Td>
              <Td data-label="Valor">{o.currency} {Number(o.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Td>
              <Td data-label="Produtos">
                {o.items?.length
                  ? <Badge tone="info">{o.items.length} {o.items.length === 1 ? 'produto' : 'produtos'}</Badge>
                  : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
              </Td>
              <Td data-label="Rastreio">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {parseCodes(o.trackingCode).length > 0
                    ? parseCodes(o.trackingCode).map(c => <Chip key={c}>{c}</Chip>)
                    : <span>—</span>}
                </div>
              </Td>
              <Td data-label="">
                <Button size="sm" variant="secondary" onClick={() => openEdit(o)} style={{ marginRight: 6 }}>Editar</Button>
                <Button size="sm" variant="danger" onClick={() => requestDelete(o.id)}>Remover</Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      {modal && (
        <Modal
          title={editing ? 'Editar Pedido' : 'Novo Pedido'}
          onClose={() => setModal(false)}
          maxWidth={700}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </>
          }
        >
          <div style={styles.grid2} className="modal-grid-2">
            <FormField label="Nº do Pedido *">
              <TextInput value={form.orderNumber || ''} onChange={e => setForm(f => ({ ...f, orderNumber: e.target.value }))} />
            </FormField>
            <FormField label="Fornecedor *">
              <TextInput value={form.supplier || ''} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
            </FormField>
            <FormField label="Origem">
              <TextInput value={form.origin || ''} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as OrderStatus }))}>
                {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </FormField>
            <FormField label="Data do Pedido">
              <TextInput type="date" value={form.orderDate || ''} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))} />
            </FormField>
            <FormField label="Previsão de Chegada">
              <TextInput type="date" value={form.expectedArrival || ''} onChange={e => setForm(f => ({ ...f, expectedArrival: e.target.value }))} />
            </FormField>
            <FormField label="Data Chegada Real">
              <TextInput type="date" value={form.actualArrival || ''} onChange={e => setForm(f => ({ ...f, actualArrival: e.target.value }))} />
            </FormField>
            <FormField label="Valor Total">
              <TextInput type="number" value={form.totalValue || 0} onChange={e => setForm(f => ({ ...f, totalValue: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Moeda">
              <Select value={form.currency || 'USD'} onChange={e => fetchExchangeRate(e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label={<>Taxa de Câmbio {fetchingRate && <span style={{ fontWeight: 400, color: 'var(--color-primary)' }}>(buscando...)</span>}</>}>
              <TextInput type="number" step="0.0001" value={form.exchangeRate || 1} onChange={e => setForm(f => ({ ...f, exchangeRate: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Nº da Invoice">
              <TextInput value={form.invoiceNumber || ''} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
            </FormField>
          </div>

          <FormField label="Códigos de Rastreio">
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <TextInput
                value={trackingInput}
                onChange={e => setTrackingInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTrackingCode(); } }}
                placeholder="Digite o código e pressione Enter ou clique em Adicionar"
                style={{ flex: 1 }}
              />
              <Button type="button" onClick={addTrackingCode} style={{ whiteSpace: 'nowrap' }}>Adicionar</Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {parseCodes(form.trackingCode).map(c => (
                <Chip key={c} onRemove={() => removeTrackingCode(c)}>{c}</Chip>
              ))}
            </div>
          </FormField>

          <div style={{ marginTop: 14 }}>
            <FormField label="Observações">
              <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ height: 70 }} />
            </FormField>
          </div>

          {/* Itens do Pedido */}
          <div style={{ marginTop: 20 }}>
            <div style={styles.sectionDivider}>Itens do Pedido</div>
            <div className="modal-item-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
              <FormField label="Produto *">
                <Select value={itemDraft.productId} onChange={e => { const p = products.find(x => x.id === Number(e.target.value)); setItemDraft(d => ({ ...d, productId: Number(e.target.value), unitPrice: p ? Number(p.costPrice) : d.unitPrice })); }}>
                  <option value={0}>Selecione...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </Select>
              </FormField>
              <FormField label="Quantidade">
                <TextInput type="number" min={0.001} step={0.001} value={itemDraft.quantity} onChange={e => setItemDraft(d => ({ ...d, quantity: Number(e.target.value) }))} />
              </FormField>
              <FormField label="Preço Unit.">
                <TextInput type="number" min={0} step={0.01} value={itemDraft.unitPrice} onChange={e => setItemDraft(d => ({ ...d, unitPrice: Number(e.target.value) }))} />
              </FormField>
              <Button type="button" onClick={addItem} className="modal-item-add-btn" style={{ alignSelf: 'flex-end' }}>+ Adicionar</Button>
            </div>
            {items.length > 0 && (
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
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
                          <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: 14, fontWeight: 700 }}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: 'var(--bg-thead)' }}>
                    <td colSpan={3} style={{ ...styles.itemTd, fontWeight: 700, textAlign: 'right' }}>Total dos Itens:</td>
                    <td style={{ ...styles.itemTd, textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Remover pedido?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { marginBottom: 16 },
  statusSelect: { padding: '4px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1.5px solid', cursor: 'pointer', outline: 'none' },
  loading: { padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14, minWidth: 0 },
  sectionDivider: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 },
  itemTh: { padding: '6px 8px', textAlign: 'left' as const, color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' },
  itemTd: { padding: '6px 8px', color: 'var(--text-body)' },
};
