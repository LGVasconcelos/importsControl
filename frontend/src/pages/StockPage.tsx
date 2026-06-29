import { useEffect, useState } from 'react';
import { stockService } from '../services/stock.service';
import type { StockMovement, MovementType } from '../services/stock.service';
import { productsService } from '../services/products.service';
import type { Product } from '../services/products.service';
import toast from 'react-hot-toast';

const typeLabel: Record<MovementType, string> = { ENTRY: '▲ Entrada', EXIT: '▼ Saída', ADJUSTMENT: '⇄ Ajuste' };
const typeColor: Record<MovementType, string> = { ENTRY: '#16a34a', EXIT: '#dc2626', ADJUSTMENT: '#ca8a04' };
const typeBg: Record<MovementType, string> = { ENTRY: '#dcfce7', EXIT: '#fee2e2', ADJUSTMENT: '#fef9c3' };

export default function StockPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ productId: 0, type: 'ENTRY' as MovementType, quantity: 1, reason: '', orderReference: '' });

  const load = () => stockService.getMovements().then(setMovements);
  useEffect(() => {
    load();
    productsService.getAll().then(setProducts);
  }, []);

  const handleSave = async () => {
    if (!form.productId) { toast.error('Selecione um produto'); return; }
    try {
      await stockService.createMovement(form);
      toast.success('Movimentação registrada!');
      setModal(false);
      setForm({ productId: 0, type: 'ENTRY', quantity: 1, reason: '', orderReference: '' });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao registrar');
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Movimentações de Estoque</h1>
        <button onClick={() => setModal(true)} style={styles.btnPrimary}>+ Nova Movimentação</button>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              {['Data', 'Produto', 'Tipo', 'Qtd', 'Antes', 'Depois', 'Motivo', 'Referência', 'Usuário'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id} style={styles.tr}>
                <td style={styles.td}>{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
                <td style={styles.td}><b>{m.product?.name}</b><br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{m.product?.sku}</span></td>
                <td style={styles.td}><span style={{ ...styles.badge, color: typeColor[m.type], background: typeBg[m.type] }}>{typeLabel[m.type]}</span></td>
                <td style={{ ...styles.td, fontWeight: 700 }}>{m.quantity}</td>
                <td style={styles.td}>{m.stockBefore}</td>
                <td style={styles.td}>{m.stockAfter}</td>
                <td style={styles.td}>{m.reason || '—'}</td>
                <td style={styles.td}>{m.orderReference || '—'}</td>
                <td style={styles.td}>{m.user?.name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <div style={styles.empty}>Nenhuma movimentação registrada.</div>}
      </div>

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Nova Movimentação</h2>
            <div style={styles.fields}>
              <div style={styles.field}>
                <label style={styles.label}>Produto *</label>
                <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: Number(e.target.value) }))} style={styles.input}>
                  <option value={0}>Selecione...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Estoque: {p.currentStock}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Tipo *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as MovementType }))} style={styles.input}>
                  <option value="ENTRY">Entrada</option>
                  <option value="EXIT">Saída</option>
                  <option value="ADJUSTMENT">Ajuste de Inventário</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Quantidade *</label>
                <input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Motivo</label>
                <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Referência do Pedido</label>
                <input value={form.orderReference} onChange={e => setForm(f => ({ ...f, orderReference: e.target.value }))} style={styles.input} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setModal(false)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={handleSave} style={styles.btnPrimary}>Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#1e293b' },
  tableWrap: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '11px 14px', fontSize: 13, color: '#374151' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  empty: { padding: '40px', textAlign: 'center', color: '#94a3b8' },
  btnPrimary: { padding: '9px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 480 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 },
  fields: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#64748b' },
  input: { padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  btnCancel: { padding: '9px 18px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
