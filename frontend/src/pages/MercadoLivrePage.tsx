import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mercadolivreService } from '../services/mercadolivre.service';
import type { MlVariation, MlListingStatus, MlDivergence } from '../services/mercadolivre.service';
import { productsService } from '../services/products.service';
import type { Product } from '../services/products.service';
import toast from 'react-hot-toast';
import {
  Button, Badge, PageHeader, Modal, TableWrap, Th, Td, EmptyState, Menu, ConfirmDialog, TextInput,
} from '../components/ui';

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

  // Modal de processar vendas pendentes
  const [pendingModal, setPendingModal] = useState(false);
  const [pendingFrom, setPendingFrom] = useState('');

  // Confirmações
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);

  // Busca de produtos
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (searchParams.get('connected') === 'true') toast.success('Mercado Livre conectado!');
    const err = searchParams.get('error');
    if (err) toast.error(`Erro ML: ${decodeURIComponent(err)}`, { duration: 8000 });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    await mercadolivreService.disconnect();
    setConnected(false);
    setConfirmDisconnect(false);
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

  const handleProcessPendingSales = async () => {
    setSyncing(true);
    try {
      const r = await mercadolivreService.processPendingSales(pendingFrom || undefined);
      if (r.processed > 0) toast.success(`${r.processed} venda(s) processada(s) — estoque atualizado!`);
      else toast.success(`Nenhuma venda pendente encontrada (${r.skipped} já processadas)`);
      if (r.errors.length) toast.error(r.errors.join('\n'), { duration: 8000 });
      setPendingModal(false);
    } catch (e: any) {
      toast.error(`Erro: ${e?.response?.data?.message || e?.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRevertMlMovements = async () => {
    setSyncing(true);
    try {
      const r = await mercadolivreService.revertMlMovements();
      toast.success(`${r.reverted} movimento(s) revertido(s). Estoque restaurado!`, { duration: 6000 });
      setConfirmRevert(false);
    } catch (e: any) {
      toast.error(`Erro: ${e?.response?.data?.message || e?.message}`);
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

  const modalProduct = mlModal ? products.find(p => p.id === mlModal.id) ?? mlModal : null;

  const filteredProducts = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const stockTone = (p: Product) =>
    p.currentStock <= 0 ? 'danger' as const : p.currentStock < p.minimumStock && p.minimumStock > 0 ? 'warning' as const : 'success' as const;

  return (
    <div>
      <PageHeader
        title="🛒 Mercado Livre"
        actions={connected && (
          <>
            <Button variant="secondary" onClick={handleSyncAll} disabled={syncing}>
              {syncing ? 'Sincronizando...' : '↑ Sincronizar Todo Estoque'}
            </Button>
            <Menu
              label="⋯ Ferramentas"
              items={[
                { label: autoLinking ? 'Vinculando...' : '🔗 Auto-vincular por SKU', onClick: handleAutoLink, disabled: autoLinking },
                { label: '🔍 Ver Variações', onClick: openVarModal },
                { label: divLoading ? 'Verificando...' : '⚠️ Verificar Divergências', onClick: handleCheckDivergences, disabled: divLoading },
                { label: '↓ Processar Vendas Pendentes', onClick: () => setPendingModal(true) },
                'divider',
                { label: '↺ Reverter Movimentos ML', onClick: () => setConfirmRevert(true), danger: true },
              ]}
            />
          </>
        )}
      />

      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' as unknown as number, padding: '18px 24px', marginBottom: 20, boxShadow: 'var(--shadow)' }}>
        {connected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)', marginRight: 8 }} />
              <strong style={{ color: 'var(--color-success)' }}>Conectado</strong>
              {nickname && <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}> — {nickname}</span>}
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmDisconnect(true)}>Desconectar</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Não conectado ao Mercado Livre</span>
            <Button onClick={handleConnect}>Conectar com Mercado Livre</Button>
          </div>
        )}
      </div>

      {connected && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Use <strong>⋯ Ferramentas → Auto-vincular por SKU</strong> para vincular automaticamente os anúncios do ML.
            O campo "Código do anúncio (SKU)" de cada anúncio no ML deve ser igual ao SKU cadastrado aqui.
            Token e vendas pendentes agora são verificados automaticamente em segundo plano — as ferramentas manuais servem como reforço.
          </p>

          {divChecked && (
            <div style={{ marginBottom: 20 }}>
              {divergences.length === 0 ? (
                <div style={{ background: 'var(--color-success-bg)', border: '1.5px solid var(--color-success)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>
                  ✅ Estoque sincronizado — nenhuma divergência encontrada
                </div>
              ) : (
                <div style={{ background: 'var(--color-warning-bg)', border: '1.5px solid var(--color-warning)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-warning)', marginBottom: 10 }}>⚠️ {divergences.length} produto(s) com estoque divergente no ML</div>
                  {divergences.map(d => (
                    <div key={d.productId} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
                      <Badge tone="primary">{d.sku}</Badge>
                      <div style={{ marginLeft: 12, flex: 1 }}>
                        {d.divergences.map(div => (
                          <span key={div.entry} style={{ fontSize: 12, marginRight: 12, color: 'var(--text-body)' }}>
                            {div.entry}: ML={div.mlStock} vs Local={div.localStock}
                          </span>
                        ))}
                      </div>
                      <Button variant="success" size="sm" onClick={() => handleSyncOne(d.productId, d.sku)}>Corrigir</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <TextInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." style={{ width: 300, maxWidth: '100%' }} />
          </div>

          <TableWrap maxHeight="calc(100vh - 320px)">
            <thead>
              <tr>{['SKU', 'Nome', 'Estoque', 'Anúncios ML', 'Ações'].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><EmptyState>Carregando...</EmptyState></td></tr>
              ) : (
                <>
                  {filteredProducts.map(p => {
                    const ids = parseIds(mlIds[p.id]);
                    return (
                      <tr key={p.id}>
                        <Td data-label="SKU"><Badge tone="primary">{p.sku}</Badge></Td>
                        <Td data-label="Nome">{p.name}</Td>
                        <Td data-label="Estoque"><Badge tone={stockTone(p)}>{p.currentStock} {p.unit}</Badge></Td>
                        <Td data-label="Anúncios ML">
                          <Button variant={ids.length > 0 ? 'secondary' : 'ghost'} size="sm" onClick={() => openMlModal(p)}>
                            {ids.length > 0 ? `🔗 ${ids.length} anúncio${ids.length > 1 ? 's' : ''}` : '+ Vincular'}
                          </Button>
                        </Td>
                        <Td data-label="">
                          {ids.length > 0 && (
                            <Button variant="success" size="sm" onClick={() => handleSyncOne(p.id, p.sku)}>↑ Sincronizar</Button>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={5}><EmptyState>Nenhum produto encontrado.</EmptyState></td></tr>
                  )}
                </>
              )}
            </tbody>
          </TableWrap>
        </>
      )}

      {/* Modal de anúncios vinculados */}
      {mlModal && modalProduct && (
        <Modal
          title="Anúncios ML vinculados"
          subtitle={<><Badge tone="primary">{modalProduct.sku}</Badge> <span style={{ marginLeft: 8 }}>{modalProduct.name}</span></>}
          onClose={() => { setMlModal(null); setListingStatus([]); }}
          maxWidth={500}
          footer={
            <>
              {parseIds(mlIds[modalProduct.id]).length > 0 && (
                <Button variant="success" onClick={() => { handleSyncOne(modalProduct.id, modalProduct.sku); setMlModal(null); setListingStatus([]); }}>
                  ↑ Sincronizar estoque agora
                </Button>
              )}
              <Button variant="secondary" onClick={() => { setMlModal(null); setListingStatus([]); }} style={{ marginLeft: 'auto' }}>Fechar</Button>
            </>
          }
        >
          {parseIds(mlIds[modalProduct.id]).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>Nenhum anúncio vinculado ainda.</p>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {parseIds(mlIds[modalProduct.id]).map(code => {
                const [itemId, varId] = code.split(':');
                const st = listingStatus.find(s => s.entry === code);
                const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = { active: 'success', paused: 'warning', closed: 'danger', unknown: 'neutral', error: 'danger' };
                const statusLabelMap: Record<string, string> = { active: 'ativo', paused: 'pausado', closed: 'encerrado', unknown: '?', error: 'erro' };
                return (
                  <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-thead)', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'inline-block', background: '#ffe600', color: '#333', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{itemId}</span>
                      {varId && <span style={{ display: 'inline-block', background: 'var(--bg-cancel)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: 12, fontSize: 11, marginLeft: 6 }}>var. {varId}</span>}
                      {statusLoading && !st && <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>...</span>}
                      {st && (
                        <span style={{ marginLeft: 8 }}>
                          <Badge tone={statusTone[st.status] || 'neutral'}>● {statusLabelMap[st.status] || st.status}</Badge>
                          <span style={{ marginLeft: 6, fontSize: 11, color: st.divergence ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                            ML: {st.mlStock}{st.divergence && ` ≠ Local: ${st.localStock}`}
                          </span>
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(code); toast.success('Copiado!'); }}>Copiar</Button>
                      <a
                        href={`https://produto.mercadolivre.com.br/${itemId.replace(/^(MLB)(\d)/, '$1-$2')}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ padding: '5px 12px', background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                      >
                        Ver ↗
                      </a>
                      <Button variant="danger" size="sm" onClick={() => removeMlId(modalProduct, code)}>Remover</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Adicionar código MLB manualmente:</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <TextInput
                value={mlInputs[modalProduct.id] || ''}
                onChange={e => setMlInputs(m => ({ ...m, [modalProduct.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMlId(modalProduct); } }}
                placeholder="MLB000000000 ou MLB000:123456"
                autoFocus
              />
              <Button onClick={() => addMlId(modalProduct)}>Adicionar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de variações */}
      {varModal && (
        <Modal
          title="🔍 Buscar Variações de Anúncio"
          onClose={() => setVarModal(false)}
          maxWidth={520}
          footer={<Button variant="secondary" onClick={() => setVarModal(false)}>Fechar</Button>}
        >
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Digite o código MLB do anúncio para listar suas variações com os códigos prontos para copiar.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <TextInput
              value={varItemInput}
              onChange={e => setVarItemInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFetchVariations(); }}
              placeholder="MLB4713389153"
            />
            <Button onClick={handleFetchVariations} disabled={varLoading}>{varLoading ? '...' : 'Buscar'}</Button>
          </div>
          {varError && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{varError}</p>}
          {variations.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead><tr><Th>Variação</Th><Th>Código</Th><Th></Th></tr></thead>
              <tbody>
                {variations.map(v => (
                  <tr key={v.id}>
                    <Td>{v.attributes}</Td>
                    <Td><code style={{ background: 'var(--bg-thead)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{v.code}</code></Td>
                    <Td><Button variant="secondary" size="sm" onClick={() => copyCode(v.code)}>Copiar</Button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {/* Modal de processar vendas pendentes */}
      {pendingModal && (
        <Modal
          title="↓ Processar Vendas Pendentes"
          onClose={() => setPendingModal(false)}
          maxWidth={420}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPendingModal(false)}>Cancelar</Button>
              <Button onClick={handleProcessPendingSales} disabled={syncing}>{syncing ? 'Processando...' : 'Processar'}</Button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Reprocessa vendas pagas no Mercado Livre que ainda não deram baixa no estoque local — útil como reforço caso algum webhook tenha falhado.
          </p>
          <TextInput
            type="date"
            value={pendingFrom}
            onChange={e => setPendingFrom(e.target.value)}
            title="Processar vendas a partir desta data (deixe vazio para últimas 50)"
          />
        </Modal>
      )}

      <ConfirmDialog
        open={confirmDisconnect}
        title="Desconectar do Mercado Livre?"
        description="A sincronização automática de estoque e o processamento de vendas serão interrompidos até reconectar."
        confirmLabel="Desconectar"
        danger
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />

      <ConfirmDialog
        open={confirmRevert}
        title="Reverter movimentos do Mercado Livre?"
        description="Isso vai desfazer todos os movimentos de estoque gerados pelo ML e restaurar as quantidades anteriores."
        confirmLabel={syncing ? 'Revertendo...' : 'Reverter'}
        danger
        onConfirm={handleRevertMlMovements}
        onCancel={() => setConfirmRevert(false)}
      />
    </div>
  );
}
