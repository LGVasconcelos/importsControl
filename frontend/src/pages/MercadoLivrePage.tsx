import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mercadolivreService } from '../services/mercadolivre.service';
import type { MlVariation, MlListingStatus, MlDivergence } from '../services/mercadolivre.service';
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
  const [autoLinking, setAutoLinking] = useState(false);

  // Modal de anúncios por produto
  const [mlModal, setMlModal] = useState<Product | null>(null);
  const [listingStatus, setListingStatus] = useState<MlListingStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  // Painel de divergências
  const [divergences, setDivergences] = useState<MlDivergence[]>([]);
  const [divLoading, setDivLoading] = useState(false);
  const [divChecked, setDivChecked] = useState(false);

  // Modal de variações
  const [varModal, setVarModal] = useState(false);
  const [varItemInput, setVarItemInput] = useState('');
  const [varLoading, setVarLoading] = useState(false);
  const [variations, setVariations] = useState<MlVariation[]>([]);
  const [varError, setVarError] = useState('');

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
    const raw = (mlInputs[product.id] || '').trim().toUpperCase();
    if (!raw) return;
    const [itemPart, varPart] = raw.split(':');
    const code = varPart
      ? `${itemPart.replace(/-/g, '')}:${varPart.trim()}`
      : itemPart.replace(/-/g, '');
    const existing = parseIds(mlIds[product.id]);
    if (existing.includes(code)) { toast.error('Código já vinculado'); return; }
    const updated = [...existing, code].join(', ');
    setMlInputs(m => ({ ...m, [product.id]: '' }));
    try {
      await productsService.update(product.id, { mlItemId: updated });
      toast.success(`${code} vinculado`);
      await load();
      // Atualiza o produto no modal se estiver aberto
      if (mlModal?.id === product.id) {
        setMlModal(prev => prev ? { ...prev } : null);
      }
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e?.response?.data?.message || e?.message || 'desconhecido'}`);
    }
  };

  const removeMlId = async (product: Product, code: string) => {
    const updated = parseIds(mlIds[product.id]).filter(c => c !== code).join(', ');
    try {
      await productsService.update(product.id, { mlItemId: updated });
      await load();
    } catch (e: any) {
      toast.error(`Erro ao remover: ${e?.response?.data?.message || e?.message || 'desconhecido'}`);
    }
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
      const r = await mercadolivreService.syncProductWithAutoPause(productId);
      if (r.ok) toast.success(r.message);
      else toast.error(`${sku}: ${r.message}`, { duration: 8000 });
    } catch (e: any) {
      toast.error(`Erro ao sincronizar ${sku}: ${e?.response?.data?.message || e?.message || 'desconhecido'}`);
    }
  };

  const openMlModal = async (p: Product) => {
    setMlModal(p);
    setListingStatus([]);
    if (mlIds[p.id]) {
      setStatusLoading(true);
      try {
        const status = await mercadolivreService.getListingStatus(p.id);
        setListingStatus(status);
      } catch { /* silencia */ } finally {
        setStatusLoading(false);
      }
    }
  };

  const handleCheckDivergences = async () => {
    setDivLoading(true);
    try {
      const divs = await mercadolivreService.getDivergences();
      setDivergences(divs);
      setDivChecked(true);
      if (divs.length === 0) toast.success('Nenhuma divergência de estoque encontrada!');
      else toast.error(`${divs.length} produto(s) com divergência de estoque`);
    } catch (e: any) {
      toast.error(`Erro: ${e?.response?.data?.message || e?.message}`);
    } finally {
      setDivLoading(false);
    }
  };

  const openVarModal = () => { setVarModal(true); setVarItemInput(''); setVariations([]); setVarError(''); };

  const handleAutoLink = async () => {
    setAutoLinking(true);
    try {
      const r = await mercadolivreService.autoLink();
      toast.success(`Vinculados: ${r.linked} | Sem SKU no ML: ${r.skipped}`, { duration: 6000 });
      if (r.notFound.length) toast.error(`SKUs não encontrados:\n${r.notFound.slice(0, 5).join('\n')}`, { duration: 8000 });
      if (r.debug?.length) console.log('[AutoLink Debug]', r.debug);
      await load();
    } catch (e: any) {
      toast.error(`Erro: ${e?.response?.data?.message || e?.message || 'desconhecido'}`);
    } finally {
      setAutoLinking(false);
    }
  };

  const handleFetchVariations = async () => {
    const raw = varItemInput.trim().toUpperCase();
    if (!raw) return;
    const itemId = raw.replace(/-/g, '');
    setVarLoading(true); setVarError(''); setVariations([]);
    try {
      const vars = await mercadolivreService.getVariations(itemId);
      if (!vars.length) setVarError('Este anúncio não tem variações cadastradas.');
      else setVariations(vars);
    } catch (e: any) {
      setVarError(e?.response?.data?.message || e?.message || 'Erro ao buscar variações');
    } finally {
      setVarLoading(false);
    }
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success(`Código ${code} copiado!`); };

  // Produto atualizado para o modal (pega do state atual)
  const modalProduct = mlModal ? products.find(p => p.id === mlModal.id) ?? mlModal : null;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>🛒 Mercado Livre</h1>
        {connected && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAutoLink} disabled={autoLinking} style={styles.btnAutoLink}>
              {autoLinking ? 'Vinculando...' : '🔗 Auto-vincular por SKU'}
            </button>
            <button onClick={openVarModal} style={styles.btnVar}>🔍 Ver Variações</button>
            <button onClick={handleCheckDivergences} disabled={divLoading} style={styles.btnDiv}>
              {divLoading ? 'Verificando...' : '⚠️ Divergências'}
            </button>
            <button onClick={handleSyncAll} disabled={syncing} style={styles.btnSync}>
              {syncing ? 'Sincronizando...' : 'Sincronizar Todo Estoque'}
            </button>
          </div>
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
            Clique <strong>Auto-vincular por SKU</strong> para vincular automaticamente os anúncios do ML.
            O campo "Código do anúncio (SKU)" de cada anúncio no ML deve ser igual ao SKU cadastrado aqui.
          </p>

          {/* Painel de divergências */}
          {divChecked && (
            <div style={{ marginBottom: 20 }}>
              {divergences.length === 0 ? (
                <div style={styles.divNone}>✅ Estoque sincronizado — nenhuma divergência encontrada</div>
              ) : (
                <div style={styles.divPanel}>
                  <div style={styles.divHeader}>⚠️ {divergences.length} produto(s) com estoque divergente no ML</div>
                  {divergences.map(d => (
                    <div key={d.productId} style={styles.divRow}>
                      <span style={styles.sku}>{d.sku}</span>
                      <div style={{ marginLeft: 12, flex: 1 }}>
                        {d.divergences.map(div => (
                          <span key={div.entry} style={{ fontSize: 12, marginRight: 12, color: 'var(--text-body)' }}>
                            {div.entry}: ML={div.mlStock} vs Local={div.localStock}
                          </span>
                        ))}
                      </div>
                      <button onClick={() => handleSyncOne(d.productId, d.sku)} style={styles.btnSyncOne}>Corrigir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={styles.tableWrap}>
            {loading ? (
              <div style={styles.empty}>Carregando...</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {['SKU', 'Nome', 'Estoque', 'Anúncios ML', 'Ações'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const ids = parseIds(mlIds[p.id]);
                    return (
                      <tr key={p.id} style={styles.tr}>
                        <td style={styles.td}><span style={styles.sku}>{p.sku}</span></td>
                        <td style={styles.td}>{p.name}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.stockBadge, color: p.currentStock <= p.minimumStock && p.minimumStock > 0 ? '#dc2626' : '#16a34a', background: p.currentStock <= p.minimumStock && p.minimumStock > 0 ? '#fee2e2' : '#dcfce7' }}>
                            {p.currentStock} {p.unit}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => openMlModal(p)} style={ids.length > 0 ? styles.mlBadgeBtn : styles.mlBadgeBtnEmpty}>
                            {ids.length > 0 ? `🔗 ${ids.length} anúncio${ids.length > 1 ? 's' : ''}` : '+ Vincular'}
                          </button>
                        </td>
                        <td style={styles.td}>
                          {ids.length > 0 && (
                            <button onClick={() => handleSyncOne(p.id, p.sku)} style={styles.btnSyncOne}>
                              ↑ Sincronizar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr><td colSpan={5} style={styles.empty}>Nenhum produto cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal de anúncios vinculados */}
      {mlModal && modalProduct && (
        <div style={styles.overlay} onClick={() => setMlModal(null)}>
          <div style={{ ...styles.modal, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h2 style={styles.modalTitle}>Anúncios ML vinculados</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  <span style={styles.sku}>{modalProduct.sku}</span>
                  <span style={{ marginLeft: 8 }}>{modalProduct.name}</span>
                </p>
              </div>
              <button onClick={() => setMlModal(null)} style={styles.closeBtn}>✕</button>
            </div>

            {parseIds(mlIds[modalProduct.id]).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                Nenhum anúncio vinculado ainda.
              </p>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {parseIds(mlIds[modalProduct.id]).map(code => {
                  const [itemId, varId] = code.split(':');
                  const st = listingStatus.find(s => s.entry === code);
                  const statusColor: Record<string, string> = { active: '#16a34a', paused: '#d97706', closed: '#dc2626', unknown: '#6b7280', error: '#dc2626' };
                  const statusLabel: Record<string, string> = { active: 'ativo', paused: 'pausado', closed: 'encerrado', unknown: '?', error: 'erro' };
                  return (
                    <div key={code} style={styles.mlRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={styles.mlChip}>{itemId}</span>
                        {varId && <span style={styles.varChip}>var. {varId}</span>}
                        {statusLoading && !st && <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>...</span>}
                        {st && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: statusColor[st.status] || '#6b7280', fontWeight: 600 }}>
                            ● {statusLabel[st.status] || st.status}
                            {' · '}
                            <span style={{ color: st.divergence ? '#dc2626' : 'inherit' }}>
                              ML: {st.mlStock}
                            </span>
                            {st.divergence && <span style={{ color: '#dc2626' }}> ≠ Local: {st.localStock}</span>}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => { navigator.clipboard.writeText(code); toast.success('Copiado!'); }} style={styles.btnCopy}>
                          Copiar
                        </button>
                        <a
                          href={`https://produto.mercadolivre.com.br/${itemId.replace(/^(MLB)(\d)/, '$1-$2')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.btnLink}
                        >
                          Ver ↗
                        </a>
                        <button onClick={() => removeMlId(modalProduct, code)} style={styles.btnRemove}>
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Adicionar código MLB manualmente:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={mlInputs[modalProduct.id] || ''}
                  onChange={e => setMlInputs(m => ({ ...m, [modalProduct.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMlId(modalProduct); } }}
                  placeholder="MLB000000000 ou MLB000:123456"
                  style={{ ...styles.mlInput, flex: 1 }}
                  autoFocus
                />
                <button onClick={() => addMlId(modalProduct)} style={styles.btnAdd}>Adicionar</button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              {parseIds(mlIds[modalProduct.id]).length > 0 && (
                <button onClick={() => { handleSyncOne(modalProduct.id, modalProduct.sku); setMlModal(null); setListingStatus([]); }} style={styles.btnSyncOne}>
                  ↑ Sincronizar estoque agora
                </button>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={() => { setMlModal(null); setListingStatus([]); }} style={styles.btnDanger}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de variações */}
      {varModal && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: 520 }}>
            <h2 style={styles.modalTitle}>🔍 Buscar Variações de Anúncio</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Digite o código MLB do anúncio para listar suas variações com os códigos prontos para copiar.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={varItemInput}
                onChange={e => setVarItemInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleFetchVariations(); }}
                placeholder="MLB4713389153"
                style={{ ...styles.mlInput, flex: 1, fontSize: 13 }}
              />
              <button onClick={handleFetchVariations} disabled={varLoading} style={styles.btnAdd}>
                {varLoading ? '...' : 'Buscar'}
              </button>
            </div>
            {varError && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{varError}</p>}
            {variations.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Variação</th>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {variations.map(v => (
                    <tr key={v.id} style={styles.tr}>
                      <td style={styles.td}>{v.attributes}</td>
                      <td style={styles.td}><code style={{ background: 'var(--bg-thead)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{v.code}</code></td>
                      <td style={styles.td}>
                        <button onClick={() => copyCode(v.code)} style={styles.btnSave}>Copiar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setVarModal(false)} style={styles.btnDanger}>Fechar</button>
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
  statusCard: { background: 'var(--bg-card)', borderRadius: 12, padding: '18px 24px', marginBottom: 20, boxShadow: 'var(--shadow)' },
  dot: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16a34a', marginRight: 8 },
  nick: { color: 'var(--text-secondary)', fontSize: 14 },
  hint: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 },
  tableWrap: { background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg-thead)' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border-row)' },
  td: { padding: '11px 14px', fontSize: 13, color: 'var(--text-body)', verticalAlign: 'middle' },
  sku: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  stockBadge: { padding: '3px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  mlBadgeBtn: { padding: '5px 12px', background: '#fefce8', color: '#854d0e', border: '1.5px solid #fde68a', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  mlBadgeBtnEmpty: { padding: '5px 12px', background: 'var(--bg-thead)', color: 'var(--text-secondary)', border: '1.5px dashed var(--border)', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  mlInput: { padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-body)', width: '100%', boxSizing: 'border-box' },
  mlChip: { display: 'inline-block', background: '#ffe600', color: '#333', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 },
  varChip: { display: 'inline-block', background: '#f3f4f6', color: '#6b7280', padding: '3px 8px', borderRadius: 12, fontSize: 11, marginLeft: 6 },
  mlRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-thead)', borderRadius: 8, marginBottom: 8 },
  btnAdd: { padding: '7px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' },
  btnCopy: { padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnLink: { padding: '4px 10px', background: '#fefce8', color: '#854d0e', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-block' },
  btnRemove: { padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  empty: { padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  btnML: { padding: '9px 20px', background: '#ffe600', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnSync: { padding: '9px 18px', background: '#ffe600', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnDanger: { padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSave: { padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnSyncOne: { padding: '5px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnVar: { padding: '9px 14px', background: 'var(--bg-cancel)', color: 'var(--text-cancel)', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnAutoLink: { padding: '9px 16px', background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnDiv: { padding: '9px 14px', background: '#fffbeb', color: '#92400e', border: '1.5px solid #fde68a', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1, padding: 4 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 },
  divPanel: { background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '12px 16px' },
  divHeader: { fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 10 },
  divRow: { display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #fde68a', gap: 8 },
  divNone: { background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#166534', fontWeight: 600 },
};
