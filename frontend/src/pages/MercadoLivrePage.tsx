import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mercadolivreService } from '../services/mercadolivre.service';
import { productsService } from '../services/products.service';
import type { Product } from '../services/products.service';
import toast from 'react-hot-toast';

export default function MercadoLivrePage() {
  const [searchParams] = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [nickname, setNickname] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [mlIds, setMlIds] = useState<Record<number, string>>({});
  const [mlInputs, setMlInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (searchParams.get('connected') === 'true') toast.success('Mercado Livre conectado!');
    const err = searchParams.get('error');
    if (err) toast.error(`Erro ML: ${decodeURIComponent(err)}`, { duration: 8000 });
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [status, prods] = await Promise.all([
        mercadolivreService.getStatus(),
        productsService.getAll(),
      ]);
      setConnected(status.connected);
      setNickname(status.nickname || '');
      setProducts(prods);
      const ids: Record<number, string> = {};
      prods.forEach(p => { if (p.mlItemId) ids[p.id] = p.mlItemId; });
      setMlIds(ids);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => { window.location.href = '/api/mercadolivre/auth'; };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar do Mercado Livre?')) return;
    await mercadolivreService.disconnect();
    setConnected(false);
    toast.success('Desconectado');
  };

  const parseIds = (v?: string) => v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];

  const addMlId = async (product: Product) => {
    const code = (mlInputs[product.id] || '').trim().toUpperCase();
    if (!code) return;
    const existing = parseIds(mlIds[product.id]);
    if (existing.includes(code)) { toast.error('Código já vinculado'); return; }
    const updated = [...existing, code].join(', ');
    setMlIds(m => ({ ...m, [product.id]: updated }));
    setMlInputs(m => ({ ...m, [product.id]: '' }));
    try {
      await productsService.update(product.id, { mlItemId: updated });
      toast.success(`${code} vinculado ao produto ${product.sku}`);
    } catch { toast.error('Erro ao salvar'); }
  };

  const removeMlId = async (product: Product, code: string) => {
    const updated = parseIds(mlIds[product.id]).filter(c => c !== code).join(', ');
    setMlIds(m => ({ ...m, [product.id]: updated }));
    try {
      await productsService.update(product.id, { mlItemId: updated });
    } catch { toast.error('Erro ao remover'); }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const r = await mercadolivreService.syncAll();
      toast.success(`Sincronizados: ${r.synced} | Sem MLB: ${r.skipped}`);
      if (r.errors.length) toast.error(r.errors.join('\n'));
    } catch {
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncOne = async (productId: number, sku: string) => {
    try {
      const r = await mercadolivreService.syncProduct(productId);
      if (r.ok) toast.success(r.message); else toast.error(r.message);
    } catch {
      toast.error(`Erro ao sincronizar ${sku}`);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>🛒 Mercado Livre</h1>
        {connected && (
          <button onClick={handleSyncAll} disabled={syncing} style={styles.btnSync}>
            {syncing ? 'Sincronizando...' : 'Sincronizar Todo Estoque'}
          </button>
        )}
      </div>

      <div style={styles.statusCard}>
        {connected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={styles.dot} />
              <strong style={{ color: '#16a34a' }}>Conectado</strong>
              {nickname && <span style={styles.nick}> — {nickname}</span>}
            </div>
            <button onClick={handleDisconnect} style={styles.btnDanger}>Desconectar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Não conectado ao Mercado Livre
            </span>
            <button onClick={handleConnect} style={styles.btnML}>
              Conectar com Mercado Livre
            </button>
          </div>
        )}
      </div>

      {connected && (
        <>
          <p style={styles.hint}>
            Vincule cada produto aos anúncios do Mercado Livre. Digite o código MLB e pressione Enter ou "+".
            Você pode adicionar múltiplos anúncios por produto.
            Para anúncios com variação (cor, tamanho etc.), use o formato <strong>MLB123456789:VARIATION_ID</strong> —
            o Variation ID aparece na URL do anúncio ou na API do ML.
          </p>
          <div style={styles.tableWrap}>
            {loading ? (
              <div style={styles.empty}>Carregando...</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {['SKU', 'Nome', 'Estoque Atual', 'Código MLB', 'Ações'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={styles.tr}>
                      <td style={styles.td}><span style={styles.sku}>{p.sku}</span></td>
                      <td style={styles.td}>{p.name}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.stockBadge, color: p.currentStock <= p.minimumStock && p.minimumStock > 0 ? '#dc2626' : '#16a34a', background: p.currentStock <= p.minimumStock && p.minimumStock > 0 ? '#fee2e2' : '#dcfce7' }}>
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                          {parseIds(mlIds[p.id]).map(code => (
                            <span key={code} style={styles.mlChip}>
                              {code}
                              <button onClick={() => removeMlId(p, code)} style={styles.mlChipRemove}>×</button>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input
                            value={mlInputs[p.id] || ''}
                            onChange={e => setMlInputs(m => ({ ...m, [p.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMlId(p); } }}
                            placeholder="MLB000000000"
                            style={styles.mlInput}
                          />
                          <button onClick={() => addMlId(p)} style={styles.btnAdd}>+</button>
                        </div>
                      </td>
                      <td style={styles.td}>
                        {parseIds(mlIds[p.id]).length > 0 && (
                          <button onClick={() => handleSyncOne(p.id, p.sku)} style={styles.btnSyncOne}>
                            Sincronizar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={5} style={styles.empty}>Nenhum produto cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' },
  statusCard: { background: 'var(--bg-card)', borderRadius: 12, padding: '18px 24px', marginBottom: 20, boxShadow: 'var(--shadow)' },
  dot: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16a34a', marginRight: 8 },
  nick: { color: 'var(--text-secondary)', fontSize: 14 },
  hint: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 },
  tableWrap: { background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg-thead)' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border-row)' },
  td: { padding: '11px 14px', fontSize: 13, color: 'var(--text-body)' },
  sku: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  stockBadge: { padding: '3px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  mlInput: { padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 12, width: 140, background: 'var(--bg-input)', color: 'var(--text-body)' },
  mlChip: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ffe600', color: '#333', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 },
  mlChipRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontWeight: 700, fontSize: 14, lineHeight: 1, padding: 0 },
  btnAdd: { padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  empty: { padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  btnML: { padding: '9px 20px', background: '#ffe600', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnSync: { padding: '9px 18px', background: '#ffe600', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnDanger: { padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSave: { marginRight: 6, padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnSyncOne: { padding: '5px 10px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
};
