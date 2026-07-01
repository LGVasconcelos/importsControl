import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { MlToken } from './ml-token.entity';
import { Product } from '../products/product.entity';
import { StockService } from '../stock/stock.service';
import { MovementType } from '../stock/stock-movement.entity';

const ML_CLIENT_ID = process.env.ML_CLIENT_ID || '3499804579353115';
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET || 'VeP2f3VTsVxegaloJc9zeHLIitQq3Iqn';
const ML_REDIRECT_URI = process.env.ML_REDIRECT_URI || 'https://imports-control.vercel.app/api/mercadolivre/callback';
const ML_API = 'https://api.mercadolibre.com';

@Injectable()
export class MercadoLivreService {
  constructor(
    @InjectRepository(MlToken)
    private readonly tokenRepo: Repository<MlToken>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly stockService: StockService,
  ) {}

  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
  }

  async getAuthUrl(): Promise<string> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // Salva o verifier temporariamente para usar no callback
    const existing = await this.tokenRepo.findOne({ where: {} });
    const token = existing || this.tokenRepo.create();
    token.codeVerifier = codeVerifier;
    // Campos obrigatórios com placeholders até o callback preencher
    if (!token.accessToken) token.accessToken = '';
    if (!token.refreshToken) token.refreshToken = '';
    if (!token.mlUserId) token.mlUserId = '';
    if (!token.expiresAt) token.expiresAt = 0;
    await this.tokenRepo.save(token);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ML_CLIENT_ID,
      redirect_uri: ML_REDIRECT_URI,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://auth.mercadolivre.com.br/authorization?${params}`;
  }

  async handleCallback(code: string): Promise<void> {
    const tokenRecord = await this.tokenRepo.findOne({ where: {} });
    const codeVerifier = tokenRecord?.codeVerifier;
    if (!codeVerifier) throw new Error('code_verifier não encontrado — tente conectar novamente');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      code,
      redirect_uri: ML_REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    const res = await fetch(`${ML_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    const data = await res.json() as any;
    if (!data.access_token) {
      throw new Error(data.error_description || data.error || data.message || JSON.stringify(data));
    }

    const userRes = await fetch(`${ML_API}/users/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const user = await userRes.json() as any;

    const existing = await this.tokenRepo.findOne({ where: {} });
    const token = existing || this.tokenRepo.create();
    token.accessToken = data.access_token;
    token.refreshToken = data.refresh_token;
    token.mlUserId = String(data.user_id);
    token.nickname = user.nickname || '';
    token.expiresAt = Date.now() + data.expires_in * 1000;
    await this.tokenRepo.save(token);
  }

  async getStatus(): Promise<{ connected: boolean; nickname?: string; mlUserId?: string }> {
    const token = await this.tokenRepo.findOne({ where: {} });
    if (!token) return { connected: false };
    return { connected: true, nickname: token.nickname, mlUserId: token.mlUserId };
  }

  async disconnect(): Promise<{ message: string }> {
    await this.tokenRepo.clear();
    return { message: 'Desconectado' };
  }

  private async getValidToken(): Promise<string> {
    const token = await this.tokenRepo.findOne({ where: {} });
    if (!token) throw new Error('Não conectado ao Mercado Livre');

    if (Date.now() < Number(token.expiresAt) - 60_000) return token.accessToken;

    const res = await fetch(`${ML_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        refresh_token: token.refreshToken,
      }),
    });
    const data = await res.json() as any;
    if (!data.access_token) throw new Error('Falha ao renovar token');

    token.accessToken = data.access_token;
    token.refreshToken = data.refresh_token;
    token.expiresAt = Date.now() + data.expires_in * 1000;
    await this.tokenRepo.save(token);
    return token.accessToken;
  }

  // Faz o PUT correto dependendo se é anúncio simples ou com variação
  // Formato simples:    MLB123456789
  // Formato variação:   MLB123456789:VARIATION_ID
  private async updateMlItemStock(mlEntry: string, quantity: number, accessToken: string): Promise<{ ok: boolean; label: string; error?: string }> {
    const [itemId, variationId] = mlEntry.split(':').map(s => s.trim());
    const label = variationId ? `${itemId} (var. ${variationId})` : itemId;

    let body: any;
    if (variationId) {
      body = { variations: [{ id: Number(variationId), available_quantity: quantity }] };
    } else {
      body = { available_quantity: quantity };
    }

    const res = await fetch(`${ML_API}/items/${itemId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json() as any;
    if (!res.ok) return { ok: false, label, error: data.message || 'Erro na API ML' };
    return { ok: true, label };
  }

  async syncProductStock(productId: number): Promise<{ ok: boolean; message: string }> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) return { ok: false, message: 'Produto não encontrado' };
    if (!product.mlItemId) return { ok: false, message: 'Produto sem MLB vinculado' };

    const ids = product.mlItemId.split(',').map(s => s.trim()).filter(Boolean);
    const accessToken = await this.getValidToken();
    const results: string[] = [];
    const errors: string[] = [];

    for (const entry of ids) {
      const r = await this.updateMlItemStock(entry, product.currentStock, accessToken);
      if (r.ok) results.push(r.label);
      else errors.push(`${r.label}: ${r.error}`);
    }

    if (errors.length) return { ok: false, message: errors.join(' | ') };
    return { ok: true, message: `${results.length} anúncio(s) atualizados para ${product.currentStock} unidades` };
  }

  async getItemVariations(itemId: string): Promise<{ id: string; attributes: string; code: string }[]> {
    // Normaliza: remove hífens e garante maiúsculas
    const cleanId = itemId.replace(/-/g, '').toUpperCase();
    const accessToken = await this.getValidToken();
    const res = await fetch(`${ML_API}/items/${cleanId}?attributes=id,variations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(data.message || 'Erro ao buscar anúncio');

    const variations: any[] = data.variations || [];
    if (!variations.length) return [];

    return variations.map((v: any) => {
      const attrs = (v.attribute_combinations || [])
        .map((a: any) => `${a.name}: ${a.value_name}`)
        .join(' | ') || 'Variação';
      return {
        id: String(v.id),
        attributes: attrs,
        code: `${cleanId}:${v.id}`,
      };
    });
  }

  async syncAllStock(): Promise<{ synced: number; skipped: number; errors: string[] }> {
    const products = await this.productRepo.find({ where: { active: true } });
    let synced = 0, skipped = 0;
    const errors: string[] = [];
    for (const p of products) {
      if (!p.mlItemId) { skipped++; continue; }
      const r = await this.syncProductStock(p.id);
      if (r.ok) synced++; else errors.push(`${p.sku}: ${r.message}`);
    }
    return { synced, skipped, errors };
  }

  async handleWebhook(body: any): Promise<void> {
    if (body.topic !== 'orders_v2') return;
    const orderId = String(body.resource || '').split('/').pop();
    if (!orderId) return;

    const accessToken = await this.getValidToken().catch(() => null);
    if (!accessToken) return;

    const orderRes = await fetch(`${ML_API}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const order = await orderRes.json() as any;
    if (order.status !== 'paid') return;

    for (const item of (order.order_items || [])) {
      const mlItemId: string = item?.item?.id;
      const variationId: string | undefined = item?.variation_id ? String(item.variation_id) : undefined;
      if (!mlItemId) continue;

      // Monta a chave de busca: "MLB123" ou "MLB123:VAR_ID"
      const searchKey = variationId ? `${mlItemId}:${variationId}` : mlItemId;

      const allProducts = await this.productRepo.find({ where: { active: true } });
      const product = allProducts.find(p => {
        if (!p.mlItemId) return false;
        return p.mlItemId.split(',').map(s => s.trim()).some(entry => {
          // Match exato (com ou sem variação) ou match só pelo itemId
          return entry === searchKey || entry === mlItemId || entry.startsWith(`${mlItemId}:`);
        });
      });
      if (!product) continue;

      const qty = Math.round(Number(item.quantity));
      if (qty <= 0) continue;

      await this.stockService.createMovement({
        productId: product.id,
        type: MovementType.EXIT,
        quantity: qty,
        reason: `Venda Mercado Livre - Pedido #${orderId}`,
        orderReference: `ML-${orderId}`,
      }, 0).catch(() => {});
    }
  }
}
