import { useEffect, useState } from 'react';
import { stockService } from '../services/stock.service';
import type { StockMovement, MovementType } from '../services/stock.service';
import { productsService } from '../services/products.service';
import type { Product } from '../services/products.service';
import toast from 'react-hot-toast';
import { Button, Badge, PageHeader, Modal, TableWrap, Th, Td, FormField, TextInput, Select } from '../components/ui';
import type { BadgeTone } from '../components/ui';

const typeLabel: Record<MovementType, string> = { ENTRY: '▲ Entrada', EXIT: '▼ Saída', ADJUSTMENT: '⇄ Ajuste' };
const typeTone: Record<MovementType, BadgeTone> = { ENTRY: 'success', EXIT: 'danger', ADJUSTMENT: 'warning' };

export default function StockPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ productId: 0, type: 'ENTRY' as MovementType, quantity: 1, reason: '', orderReference: '' });
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); stockService.getMovements().then(setMovements).finally(() => setLoading(false)); };
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
      <PageHeader
        title="Movimentações de Estoque"
        actions={<Button onClick={() => setModal(true)}>+ Nova Movimentação</Button>}
      />

      <TableWrap>
        <thead>
          <tr>
            {['Data', 'Produto', 'Tipo', 'Qtd', 'Antes', 'Depois', 'Motivo', 'Referência', 'Usuário'].map(h => (
              <Th key={h}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movements.map(m => (
            <tr key={m.id}>
              <Td data-label="Data">{new Date(m.createdAt).toLocaleString('pt-BR')}</Td>
              <Td data-label="Produto"><b>{m.product?.name}</b><br /><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.product?.sku}</span></Td>
              <Td data-label="Tipo"><Badge tone={typeTone[m.type]}>{typeLabel[m.type]}</Badge></Td>
              <Td data-label="Qtd" style={{ fontWeight: 700 }}>{m.quantity}</Td>
              <Td data-label="Antes">{m.stockBefore}</Td>
              <Td data-label="Depois">{m.stockAfter}</Td>
              <Td data-label="Motivo">{m.reason || '—'}</Td>
              <Td data-label="Referência">{m.orderReference || '—'}</Td>
              <Td data-label="Usuário">{m.user?.name || '—'}</Td>
            </tr>
          ))}
          {loading ? (
            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando...</td></tr>
          ) : movements.length === 0 && (
            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhuma movimentação registrada.</td></tr>
          )}
        </tbody>
      </TableWrap>

      {modal && (
        <Modal
          title="Nova Movimentação"
          onClose={() => setModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Registrar</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Produto *">
              <Select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: Number(e.target.value) }))}>
                <option value={0}>Selecione...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Estoque: {p.currentStock}</option>)}
              </Select>
            </FormField>
            <FormField label="Tipo *">
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as MovementType }))}>
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Saída</option>
                <option value="ADJUSTMENT">Ajuste de Inventário</option>
              </Select>
            </FormField>
            <FormField label="Quantidade *">
              <TextInput type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Motivo">
              <TextInput value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </FormField>
            <FormField label="Referência do Pedido">
              <TextInput value={form.orderReference} onChange={e => setForm(f => ({ ...f, orderReference: e.target.value }))} />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
