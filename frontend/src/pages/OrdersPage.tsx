import { useEffect, useState } from 'react';
import { ordersService } from '../services/orders.service';
import type { Order, OrderStatus } from '../services/orders.service';
import toast from 'react-hot-toast';

const statusLabel: Record<OrderStatus, string> = {
  PENDING: 'Pendente', CONFIRMED: 'Confirmado', IN_TRANSIT: 'Em Trânsito',
  CUSTOMS: 'Desembaraço', RECEIVED: 'Recebido', CANCELLED: 'Cancelado',
};
const statusColor: Record<OrderStatus, string> = {
  PENDING: '#64748b', CONFIRMED: '#2563eb', IN_TRANSIT: '#d97706',
  CUSTOMS: '#7c3aed', RECEIVED: '#16a34a', CANCELLED: '#dc2626',
};

const emptyForm: Partial<Order> = {
  orderNumber: '', supplier: '', origin: '', status: 'PENDING',
  orderDate: '', expectedArrival: '', totalValue: 0, currency: 'USD', exchangeRate: 1,
  invoiceNumber: '', trackingCode: '', notes: '',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Order>>(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);

  const load = () => ordersService.getAll().then(setOrders);
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (o: Order) => { setForm(o); setEditing(o.id); setModal(true); };

  const handleSave = async () => {
    try {
      if (editing) await ordersService.update(editing, form);
      else await ordersService.create(form);
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

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Pedidos de Importação</h1>
        <button onClick={openCreate} style={styles.btnPrimary}>+ Novo Pedido</button>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              {['Nº Pedido', 'Fornecedor', 'Origem', 'Status', 'Data Pedido', 'Prev. Chegada', 'Valor Total', 'Rastreio', 'Ações'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={styles.tr}>
                <td style={styles.td}><span style={styles.sku}>{o.orderNumber}</span></td>
                <td style={styles.td}>{o.supplier}</td>
                <td style={styles.td}>{o.origin || '—'}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, color: statusColor[o.status], background: statusColor[o.status] + '20' }}>
                    {statusLabel[o.status]}
                  </span>
                </td>
                <td style={styles.td}>{o.orderDate || '—'}</td>
                <td style={styles.td}>{o.expectedArrival || '—'}</td>
                <td style={styles.td}>{o.currency} {Number(o.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style={styles.td}>{o.trackingCode || '—'}</td>
                <td style={styles.td}>
                  <button onClick={() => openEdit(o)} style={styles.btnEdit}>Editar</button>
                  <button onClick={() => handleDelete(o.id)} style={styles.btnDel}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div style={styles.empty}>Nenhum pedido cadastrado.</div>}
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
              <div style={styles.field}><label style={styles.label}>Moeda</label><input value={form.currency || 'USD'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Taxa de Câmbio</label><input type="number" step="0.0001" value={form.exchangeRate || 1} onChange={e => setForm(f => ({ ...f, exchangeRate: Number(e.target.value) }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Nº da Invoice</label><input value={form.invoiceNumber || ''} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Código de Rastreio</label><input value={form.trackingCode || ''} onChange={e => setForm(f => ({ ...f, trackingCode: e.target.value }))} style={styles.input} /></div>
            </div>
            <div style={styles.field}><label style={styles.label}>Observações</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...styles.input, height: 70, resize: 'vertical' }} /></div>
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
  btnCancel: { padding: '9px 18px', background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
