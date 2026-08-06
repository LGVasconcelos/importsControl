import { useEffect, useState } from 'react';
import { productsService } from '../services/products.service';
import type { Product, KitItem } from '../services/products.service';
import { stockService } from '../services/stock.service';
import type { MovementType } from '../services/stock.service';
import toast from 'react-hot-toast';
import {
  Button, Badge, StatCard, PageHeader, Modal, TableWrap, Th, Td, FormField, TextInput, Select, ConfirmDialog, EmptyState,
} from '../components/ui';

const emptyForm: Partial<Product> = { sku: '', name: '', description: '', origin: '', supplier: '', unit: 'UN', costPrice: 0, salePrice: 0, minimumStock: 0, category: '', ncm: '', isKit: false };
const emptyAdj = { type: 'ENTRY' as MovementType, quantity: 1, reason: '' };

type PendingKitItem = { tempId: number; id?: number; componentProductId: number; quantity: number; component?: Product };
let _tempId = 0;

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
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | 'zero' | 'low' | 'ok'>('all');

  // Kit inline state (dentro do formulário de produto)
  const [pendingKitItems, setPendingKitItems] = useState<PendingKitItem[]>([]);
  const [removedKitItemIds, setRemovedKitItemIds] = useState<number[]>([]);
  const [newKitComp, setNewKitComp] = useState({ componentProductId: '', quantity: 1 });

  const load = () => { setLoading(true); productsService.getAll(search || undefined).then(setProducts).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [search]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setPendingKitItems([]);
    setRemovedKitItemIds([]);
    setNewKitComp({ componentProductId: '', quantity: 1 });
    setModal(true);
  };

  const openEdit = async (p: Product) => {
    setForm(p);
    setEditing(p.id);
    setRemovedKitItemIds([]);
    setNewKitComp({ componentProductId: '', quantity: 1 });
    if (p.isKit) {
      const items = await productsService.getKitItems(p.id).catch(() => [] as KitItem[]);
      setPendingKitItems(items.map(ki => ({ tempId: ++_tempId, id: ki.id, componentProductId: ki.componentProductId, quantity: ki.quantity, component: ki.component })));
    } else {
      setPendingKitItems([]);
    }
    setModal(true);
  };

  const handleAddKitCompToForm = () => {
    if (!newKitComp.componentProductId) { toast.error('Selecione um componente'); return; }
    if (newKitComp.quantity < 1) { toast.error('Quantidade mínima é 1'); return; }
    const compId = Number(newKitComp.componentProductId);
    if (pendingKitItems.some(i => i.componentProductId === compId)) { toast.error('Componente já adicionado'); return; }
    const component = products.find(p => p.id === compId);
    setPendingKitItems(prev => [...prev, { tempId: ++_tempId, componentProductId: compId, quantity: newKitComp.quantity, component }]);
    setNewKitComp({ componentProductId: '', quantity: 1 });
  };

  const handleRemoveKitCompFromForm = (tempId: number) => {
    const item = pendingKitItems.find(i => i.tempId === tempId);
    if (item?.id) setRemovedKitItemIds(prev => [...prev, item.id!]);
    setPendingKitItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const handleSave = async () => {
    try {
      if (form.isKit && pendingKitItems.length === 0) {
        toast.error('Adicione ao menos um componente ao kit');
        return;
      }
      const payload = {
        ...form,
        costPrice: form.costPrice !== undefined ? Number(form.costPrice) : undefined,
        salePrice: form.salePrice !== undefined ? Number(form.salePrice) : undefined,
        minimumStock: form.minimumStock !== undefined ? Number(form.minimumStock) : undefined,
      };
      let productId: number;
      if (editing) {
        await productsService.update(editing, payload);
        productId = editing;
      } else {
        const created = await productsService.create(payload);
        productId = created.id;
      }

      // Sincroniza componentes do kit
      if (form.isKit) {
        for (const id of removedKitItemIds) {
          await productsService.removeKitItem(id).catch(() => {});
        }
        for (const item of pendingKitItems.filter(i => !i.id)) {
          await productsService.addKitItem(productId, item.componentProductId, item.quantity).catch(() => {});
        }
      }

      toast.success(editing ? 'Produto atualizado!' : 'Produto criado!');
      setModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await productsService.remove(deleteTarget.id);
    toast.success('Produto desativado');
    setDeleteTarget(null);
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

  const filtered = products.filter(p => {
    if (stockFilter === 'zero') return p.currentStock <= 0;
    if (stockFilter === 'low') return p.currentStock > 0 && p.minimumStock > 0 && p.currentStock < p.minimumStock;
    if (stockFilter === 'ok') return !(p.currentStock <= 0) && !(p.minimumStock > 0 && p.currentStock < p.minimumStock);
    return true;
  });

  const stockTone = (p: Product): 'danger' | 'warning' | 'success' =>
    p.currentStock <= 0 ? 'danger' : p.currentStock < p.minimumStock && p.minimumStock > 0 ? 'warning' : 'success';

  const filters = [
    { key: 'all' as const, label: 'Total', value: total, color: 'var(--color-primary)' },
    { key: 'zero' as const, label: 'Em falta', value: zeroStock, color: 'var(--color-danger)' },
    { key: 'low' as const, label: 'Estoque baixo', value: lowStock, color: 'var(--color-warning)' },
    { key: 'ok' as const, label: 'Normal', value: okStock, color: 'var(--color-success)' },
  ];

  return (
    <div>
      <PageHeader title="Produtos" actions={<Button onClick={openCreate}>+ Novo Produto</Button>} />

      {/* Cards de resumo */}
      {!loading && (
        <div className="stat-row-products" style={styles.statRow}>
          {filters.map(f => (
            <StatCard
              key={f.key}
              label={f.label}
              value={f.value}
              color={f.color}
              active={stockFilter === f.key}
              onClick={() => setStockFilter(cur => cur === f.key ? 'all' : f.key)}
            />
          ))}
        </div>
      )}

      {/* Barra de busca */}
      <div style={styles.toolbar}>
        <TextInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." style={{ maxWidth: 340 }} />
        {stockFilter !== 'all' && (
          <Button variant="secondary" size="sm" onClick={() => setStockFilter('all')}>✕ Limpar filtro</Button>
        )}
      </div>

      <TableWrap>
        <thead>
          <tr>
            {['SKU', 'Produto', 'Estoque', 'Preços', 'Ações'].map(h => <Th key={h}>{h}</Th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5}><EmptyState>Carregando...</EmptyState></td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={5}><EmptyState>Nenhum produto encontrado.</EmptyState></td></tr>
          ) : (
            filtered.map(p => (
              <tr key={p.id} style={styles.tr}>
                <Td data-label="SKU">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                    <Badge tone="primary">{p.sku}</Badge>
                    {p.category && <Badge tone="neutral">{p.category}</Badge>}
                    {p.isKit && <Badge tone="info">KIT</Badge>}
                  </div>
                </Td>
                <Td data-label="Produto">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                    <span style={styles.subText}>
                      {[p.supplier, p.origin].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </div>
                </Td>
                <Td data-label="Estoque">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                    <Badge tone={stockTone(p)}>{p.currentStock} {p.unit}</Badge>
                    {p.minimumStock > 0 && (
                      <span style={styles.minStock}>mín. {p.minimumStock}</span>
                    )}
                  </div>
                </Td>
                <Td data-label="Preços">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={styles.priceRow}><span style={styles.priceLabel}>Custo</span> R$ {Number(p.costPrice).toFixed(2)}</span>
                    <span style={styles.priceRow}><span style={styles.priceLabel}>Venda</span> R$ {Number(p.salePrice).toFixed(2)}</span>
                  </div>
                </Td>
                <Td data-label="">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>{p.isKit ? 'Editar Kit' : 'Editar'}</Button>
                    {!p.isKit && <Button variant="success" size="sm" onClick={() => openAdj(p)}>Estoque</Button>}
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>Desativar</Button>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>

      {modal && (
        <Modal
          title={editing ? 'Editar Produto' : 'Novo Produto'}
          onClose={() => setModal(false)}
          maxWidth={680}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </>
          }
        >
          <div style={styles.grid2}>
            {([
              ['sku', 'SKU *'], ['name', 'Nome *'], ['description', 'Descrição'],
              ['supplier', 'Fornecedor'], ['origin', 'Origem'], ['unit', 'Unidade'],
              ['category', 'Categoria'], ['ncm', 'NCM'],
            ] as [keyof Product, string][]).map(([key, label]) => (
              <FormField key={key} label={label}>
                <TextInput value={String(form[key] ?? '')} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </FormField>
            ))}
            {([['costPrice', 'Preço de Custo'], ['salePrice', 'Preço de Venda'], ['minimumStock', 'Estoque Mínimo']] as [keyof Product, string][]).map(([key, label]) => (
              <FormField key={key} label={label}>
                <TextInput type="number" value={String(form[key] ?? 0)} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
              </FormField>
            ))}
          </div>

          {/* Toggle kit */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="isKit" checked={!!form.isKit}
              onChange={e => { setForm(f => ({ ...f, isKit: e.target.checked })); if (!e.target.checked) { setPendingKitItems([]); setRemovedKitItemIds([]); } }}
              style={{ width: 16, height: 16, accentColor: 'var(--color-info)', cursor: 'pointer' }} />
            <label htmlFor="isKit" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
              Este produto é um <span style={{ color: 'var(--color-info)' }}>Kit</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 6 }}>
                (ao vender no ML, dá baixa nos componentes automaticamente)
              </span>
            </label>
          </div>

          {/* Seção de componentes inline */}
          {form.isKit && (
            <div style={styles.kitBox}>
              <p style={styles.kitBoxTitle}>Componentes do Kit</p>

              {pendingKitItems.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                  <thead>
                    <tr>
                      {['Produto', 'SKU', 'Qtd / kit', ''].map(h => (
                        <th key={h} style={styles.kitTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingKitItems.map(ki => (
                      <tr key={ki.tempId} style={{ borderBottom: '1px solid var(--color-info-bg)' }}>
                        <td style={{ padding: '7px 8px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{ki.component?.name ?? `ID ${ki.componentProductId}`}</td>
                        <td style={{ padding: '7px 8px' }}><Badge tone="primary">{ki.component?.sku ?? '—'}</Badge></td>
                        <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                          <TextInput type="number" min={1} value={ki.quantity}
                            onChange={e => setPendingKitItems(prev => prev.map(i => i.tempId === ki.tempId ? { ...i, quantity: Number(e.target.value) } : i))}
                            style={{ width: 60, textAlign: 'center', padding: '4px 6px' }} />
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <Button variant="danger" size="sm" onClick={() => handleRemoveKitCompFromForm(ki.tempId)} style={{ padding: '3px 8px', fontSize: 11 }}>✕</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <FormField label={<span style={{ color: 'var(--color-info)' }}>Produto componente</span>}>
                    <Select value={newKitComp.componentProductId}
                      onChange={e => setNewKitComp(c => ({ ...c, componentProductId: e.target.value }))}>
                      <option value="">Selecionar produto...</option>
                      {products.filter(p => !p.isKit && p.active && p.id !== (editing ?? 0) && !pendingKitItems.some(ki => ki.componentProductId === p.id)).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </Select>
                  </FormField>
                </div>
                <div style={{ width: 90 }}>
                  <FormField label={<span style={{ color: 'var(--color-info)' }}>Quantidade</span>}>
                    <TextInput type="number" min={1} value={newKitComp.quantity}
                      onChange={e => setNewKitComp(c => ({ ...c, quantity: Number(e.target.value) }))} />
                  </FormField>
                </div>
                <Button onClick={handleAddKitCompToForm} style={{ background: 'var(--color-info)' }}>+ Adicionar</Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {adjModal && adjProduct && (
        <Modal
          title={`Ajustar Estoque — ${adjProduct.name}`}
          onClose={() => setAdjModal(false)}
          maxWidth={420}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAdjModal(false)}>Cancelar</Button>
              <Button onClick={handleAdj}>Salvar</Button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Estoque atual: <strong style={{ color: 'var(--text-primary)' }}>{adjProduct.currentStock} {adjProduct.unit}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Tipo de Movimento">
              <Select value={adj.type} onChange={e => setAdj(a => ({ ...a, type: e.target.value as MovementType }))}>
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Saída</option>
                <option value="ADJUSTMENT">Ajuste (definir total)</option>
              </Select>
            </FormField>
            <FormField label={adj.type === 'ADJUSTMENT' ? 'Novo total em estoque' : 'Quantidade'}>
              <TextInput type="number" min={0} value={adj.quantity} onChange={e => setAdj(a => ({ ...a, quantity: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Motivo (opcional)">
              <TextInput value={adj.reason} onChange={e => setAdj(a => ({ ...a, reason: e.target.value }))} placeholder="Ex: Inventário, devolução..." />
            </FormField>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Desativar produto?"
        description={`Tem certeza que deseja desativar "${deleteTarget?.name}"? Ele deixará de aparecer nas listagens ativas.`}
        confirmLabel="Desativar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  toolbar: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 },
  tr: { borderBottom: '1px solid var(--border-row)' },
  subText: { fontSize: 11, color: 'var(--text-secondary)' },
  minStock: { fontSize: 11, color: 'var(--text-secondary)' },
  priceRow: { fontSize: 12, color: 'var(--text-body)', display: 'flex', gap: 4, alignItems: 'center' },
  priceLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', minWidth: 34 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  kitBox: { marginTop: 16, border: '1.5px solid var(--color-info-bg)', borderRadius: 10, padding: '14px 16px', background: 'var(--color-info-bg)' },
  kitBoxTitle: { fontSize: 12, fontWeight: 700, color: 'var(--color-info)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  kitTh: { padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-info)', borderBottom: '1px solid var(--color-info-bg)' },
};
