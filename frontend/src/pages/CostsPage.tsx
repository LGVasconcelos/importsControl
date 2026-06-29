import { useEffect, useState } from 'react';
import { costsService } from '../services/costs.service';
import type { Cost } from '../services/costs.service';
import { ordersService } from '../services/orders.service';
import type { Order } from '../services/orders.service';
import toast from 'react-hot-toast';

const COST_TYPES = ['Frete Internacional', 'Frete Nacional', 'Imposto de Importação (II)', 'IPI', 'ICMS', 'PIS/COFINS', 'Despachante', 'Armazenagem', 'Seguro', 'Outros'];

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Cost>>({ orderId: 0, description: '', value: 0, currency: 'BRL', exchangeRate: 1, costType: '', notes: '' });

  const load = () => costsService.getAll().then(setCosts);
  useEffect(() => {
    load();
    ordersService.getAll().then(setOrders);
  }, []);

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

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Custos de Importação</h1>
          <p style={styles.total}>Total acumulado: <strong>R$ {totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
        </div>
        <button onClick={() => setModal(true)} style={styles.btnPrimary}>+ Novo Custo</button>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
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
                <td style={styles.td}><span style={styles.sku}>{c.order?.orderNumber || `#${c.orderId}`}</span></td>
                <td style={styles.td}>{c.description}</td>
                <td style={styles.td}>{c.costType || '—'}</td>
                <td style={styles.td}>{Number(c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style={styles.td}>{c.currency}</td>
                <td style={styles.td}>{Number(c.exchangeRate).toFixed(4)}</td>
                <td style={{ ...styles.td, fontWeight: 700 }}>R$ {Number(c.valueInBrl || c.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style={styles.td}>{c.notes || '—'}</td>
                <td style={styles.td}><button onClick={() => handleDelete(c.id)} style={styles.btnDel}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {costs.length === 0 && <div style={styles.empty}>Nenhum custo registrado.</div>}
      </div>

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
  tableWrap: { background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg-thead)' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
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
};
