import { useEffect, useState } from 'react';
import { productsService } from '../services/products.service';
import type { Product } from '../services/products.service';
import { stockService } from '../services/stock.service';
import type { MovementType } from '../services/stock.service';
import toast from 'react-hot-toast';

const emptyForm: Partial<Product> = { sku: '', name: '', description: '', origin: '', supplier: '', unit: 'UN', costPrice: 0, salePrice: 0, minimumStock: 0, category: '', ncm: '' };
const emptyAdj = { type: 'ENTRY' as MovementType, quantity: 1, reason: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<Product>>(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjModal, setAdjModal] = useState(false);
  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adj, setAdj] = useState(emptyAdj);

  const load = () => { setLoading(true); productsService.getAll(search || undefined).then(setProducts).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (p: Product) => { setForm(p); setEditing(p.id); setModal(true); };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        costPrice: form.costPrice !== undefined ? Number(form.costPrice) : undefined,
        salePrice: form.salePrice !== undefined ? Number(form.salePrice) : undefined,
        minimumStock: form.minimumStock !== undefined ? Number(form.minimumStock) : undefined,
      };
      if (editing) await productsService.update(editing, payload);
      else await productsService.create(payload);
      toast.success(editing ? 'Produto atualizado!' : 'Produto criado!');
      setModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Desativar este produto?')) return;
    await productsService.remove(id);
    toast.success('Produto desativado');
    load();
  };

  const openAdj = (p: Product) => { setAdjProduct(p); setAdj(emptyAdj); setAdjModal(true); };

  const handleAdj = async () => {
    if (!adjProduct) return;
    if (adj.quantity <= 0) { toast.error('Quantidade deve ser maior que zero'); return; }
    try {
      await stockService.createMovement({ productId: adjProduct.id, type: adj.type, quantity: adj.quantity, reason: adj.reason || undefined });
      toast.success('Estoque ajustado!');
      setAdjModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao ajustar estoque');
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Produtos</h1>
        <button onClick={openCreate} style={styles.btnPrimary}>+ Novo Produto</button>
      </div>
      <div style={styles.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." style={styles.searchInput} />
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              {['SKU', 'Nome', 'Fornecedor', 'Origem', 'Estoque', 'Mín.', 'Custo (R$)', 'Venda (R$)', 'Ações'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}><span style={styles.sku}>{p.sku}</span></td>
                <td style={styles.td}>{p.name}</td>
                <td style={styles.td}>{p.supplier || '—'}</td>
                <td style={styles.td}>{p.origin || '—'}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.stockBadge, color: p.currentStock <= p.minimumStock && p.minimumStock > 0 ? '#dc2626' : '#16a34a', background: p.currentStock <= p.minimumStock && p.minimumStock > 0 ? '#fee2e2' : '#dcfce7' }}>
                    {p.currentStock} {p.unit}
                  </span>
                </td>
                <td style={styles.td}>{p.minimumStock}</td>
                <td style={styles.td}>{Number(p.costPrice).toFixed(2)}</td>
                <td style={styles.td}>{Number(p.salePrice).toFixed(2)}</td>
                <td style={styles.td}>
                  <button onClick={() => openEdit(p)} style={styles.btnEdit}>Editar</button>
                  <button onClick={() => openAdj(p)} style={styles.btnStock}>Estoque</button>
                  <button onClick={() => handleDelete(p.id)} style={styles.btnDel}>Desativar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? <div style={styles.empty}>Carregando...</div> : products.length === 0 && <div style={styles.empty}>Nenhum produto encontrado.</div>}
      </div>

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
            <div style={styles.grid2}>
              {([
                ['sku', 'SKU *'], ['name', 'Nome *'], ['description', 'Descrição'],
                ['supplier', 'Fornecedor'], ['origin', 'Origem'], ['unit', 'Unidade'],
                ['category', 'Categoria'], ['ncm', 'NCM'],
              ] as [keyof Product, string][]).map(([key, label]) => (
                <div key={key} style={styles.field}>
                  <label style={styles.label}>{label}</label>
                  <input value={String(form[key] ?? '')} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={styles.input} />
                </div>
              ))}
              {([['costPrice', 'Preço de Custo'], ['salePrice', 'Preço de Venda'], ['minimumStock', 'Estoque Mínimo']] as [keyof Product, string][]).map(([key, label]) => (
                <div key={key} style={styles.field}>
                  <label style={styles.label}>{label}</label>
                  <input type="number" value={String(form[key] ?? 0)} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} style={styles.input} />
                </div>
              ))}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setModal(false)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={handleSave} style={styles.btnPrimary}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {adjModal && adjProduct && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: 420 }}>
            <h2 style={styles.modalTitle}>Ajustar Estoque — {adjProduct.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Estoque atual: <strong style={{ color: 'var(--text-primary)' }}>{adjProduct.currentStock} {adjProduct.unit}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={styles.field}>
                <label style={styles.label}>Tipo de Movimento</label>
                <select value={adj.type} onChange={e => setAdj(a => ({ ...a, type: e.target.value as MovementType }))} style={styles.input}>
                  <option value="ENTRY">Entrada</option>
                  <option value="EXIT">Saída</option>
                  <option value="ADJUSTMENT">Ajuste (definir total)</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{adj.type === 'ADJUSTMENT' ? 'Novo total em estoque' : 'Quantidade'}</label>
                <input type="number" min={0} value={adj.quantity} onChange={e => setAdj(a => ({ ...a, quantity: Number(e.target.value) }))} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Motivo (opcional)</label>
                <input value={adj.reason} onChange={e => setAdj(a => ({ ...a, reason: e.target.value }))} placeholder="Ex: Inventário, devolução..." style={styles.input} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setAdjModal(false)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={handleAdj} style={styles.btnPrimary}>Salvar</button>
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
  searchInput: { padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: 8, width: 300, fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-body)' },
  tableWrap: { background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg-thead)' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border-row)' },
  td: { padding: '11px 14px', fontSize: 13, color: 'var(--text-body)' },
  sku: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  stockBadge: { padding: '3px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btnPrimary: { padding: '9px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnEdit: { marginRight: 6, padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnStock: { marginRight: 6, padding: '5px 10px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnDel: { padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-body)' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  btnCancel: { padding: '9px 18px', background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
