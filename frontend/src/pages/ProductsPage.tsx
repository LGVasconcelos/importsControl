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

  const total = products.length;
  const zeroStock = products.filter(p => p.currentStock <= 0).length;
  const lowStock = products.filter(p => p.currentStock > 0 && p.minimumStock > 0 && p.currentStock < p.minimumStock).length;
  const okStock = total - zeroStock - lowStock;

  const [stockFilter, setStockFilter] = useState<'all' | 'zero' | 'low' | 'ok'>('all');

  const filtered = products.filter(p => {
    if (stockFilter === 'zero') return p.currentStock <= 0;
    if (stockFilter === 'low') return p.currentStock > 0 && p.minimumStock > 0 && p.currentStock < p.minimumStock;
    if (stockFilter === 'ok') return !(p.currentStock <= 0) && !(p.minimumStock > 0 && p.currentStock < p.minimumStock);
    return true;
  });

  const stockColor = (p: Product) => ({
    color: p.currentStock <= 0 ? '#dc2626' : p.currentStock < p.minimumStock && p.minimumStock > 0 ? '#92400e' : '#16a34a',
    background: p.currentStock <= 0 ? '#fee2e2' : p.currentStock < p.minimumStock && p.minimumStock > 0 ? '#fef3c7' : '#dcfce7',
  });

  return (
    <div>
      <div style={styles.header} className="page-header">
        <h1 style={styles.title}>Produtos</h1>
        <button onClick={openCreate} style={styles.btnPrimary}>+ Novo Produto</button>
      </div>

      {/* Cards de resumo */}
      {!loading && (
        <div style={styles.statRow} className="stat-row-products">
          {([
            { label: 'Total', value: total, color: '#2563eb', bg: '#eff6ff', filter: 'all' },
            { label: 'Em falta', value: zeroStock, color: '#dc2626', bg: '#fee2e2', filter: 'zero' },
            { label: 'Estoque baixo', value: lowStock, color: '#92400e', bg: '#fef3c7', filter: 'low' },
            { label: 'Normal', value: okStock, color: '#16a34a', bg: '#dcfce7', filter: 'ok' },
          ] as const).map(s => (
            <button key={s.filter} onClick={() => setStockFilter(f => f === s.filter ? 'all' : s.filter)}
              style={{ ...styles.statCard, borderColor: stockFilter === s.filter ? s.color : 'transparent', boxShadow: stockFilter === s.filter ? `0 0 0 2px ${s.color}40` : 'var(--shadow)' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: '2px 8px', borderRadius: 20 }}>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Barra de busca */}
      <div style={styles.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." style={styles.searchInput} />
        {stockFilter !== 'all' && (
          <button onClick={() => setStockFilter('all')} style={styles.clearFilter}>✕ Limpar filtro</button>
        )}
      </div>

      <div style={styles.tableWrap} className="responsive-table-wrap">
        <table style={styles.table} className="responsive-table">
          <thead>
            <tr style={styles.thead}>
              {['SKU', 'Produto', 'Estoque', 'Preços', 'Ações'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td} data-label="SKU">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={styles.sku}>{p.sku}</span>
                    {p.category && <span style={styles.categoryTag}>{p.category}</span>}
                  </div>
                </td>
                <td style={styles.td} data-label="Produto">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                    <span style={styles.subText}>
                      {[p.supplier, p.origin].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </div>
                </td>
                <td style={styles.td} data-label="Estoque">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                    <span style={{ ...styles.stockBadge, ...stockColor(p) }}>
                      {p.currentStock} {p.unit}
                    </span>
                    {p.minimumStock > 0 && (
                      <span style={styles.minStock}>mín. {p.minimumStock}</span>
                    )}
                  </div>
                </td>
                <td style={styles.td} data-label="Preços">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={styles.priceRow}><span style={styles.priceLabel}>Custo</span> R$ {Number(p.costPrice).toFixed(2)}</span>
                    <span style={styles.priceRow}><span style={styles.priceLabel}>Venda</span> R$ {Number(p.salePrice).toFixed(2)}</span>
                  </div>
                </td>
                <td style={styles.td} data-label="">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => openEdit(p)} style={styles.btnEdit}>Editar</button>
                    <button onClick={() => openAdj(p)} style={styles.btnStock}>Estoque</button>
                    <button onClick={() => handleDelete(p.id)} style={styles.btnDel}>Desativar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? (
          <div style={styles.empty}>Carregando...</div>
        ) : filtered.length === 0 && (
          <div style={styles.empty}>Nenhum produto encontrado.</div>
        )}
      </div>

      {modal && (
        <div style={styles.overlay} className="modal-overlay">
          <div style={styles.modal} className="modal-box">
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
        <div style={styles.overlay} className="modal-overlay">
          <div style={{ ...styles.modal, maxWidth: 420 }} className="modal-box">
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
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 10px', background: 'var(--bg-card)', border: '2px solid transparent', borderRadius: 12, cursor: 'pointer', transition: 'box-shadow .15s, border-color .15s', boxShadow: 'var(--shadow)' },
  toolbar: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 },
  searchInput: { padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: 8, flex: 1, maxWidth: 340, fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-body)' },
  clearFilter: { padding: '7px 12px', background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  tableWrap: { background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow)', overflowY: 'auto', overflowX: 'auto', maxHeight: 'calc(100vh - 280px)', minHeight: 200 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg-thead)' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-thead)', zIndex: 1 },
  tr: { borderBottom: '1px solid var(--border-row)' },
  td: { padding: '11px 14px', fontSize: 13, color: 'var(--text-body)', verticalAlign: 'middle' },
  sku: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  categoryTag: { background: 'var(--bg-thead)', color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 500 },
  subText: { fontSize: 11, color: 'var(--text-secondary)' },
  stockBadge: { padding: '3px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  minStock: { fontSize: 11, color: 'var(--text-secondary)' },
  priceRow: { fontSize: 12, color: 'var(--text-body)', display: 'flex', gap: 4, alignItems: 'center' },
  priceLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', minWidth: 34 },
  btnPrimary: { padding: '9px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnEdit: { padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnStock: { padding: '5px 10px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnDel: { padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 680, maxHeight: '90dvh', overflowY: 'auto', boxSizing: 'border-box' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-body)' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  btnCancel: { padding: '9px 18px', background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
