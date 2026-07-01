import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ML_CLIENT_ID,
      redirect_uri: ML_REDIRECT_URI,
    });
    return `https://auth.mercadolivre.com.br/authorization?${params}`;
  }

  async handleCallback(code: string): Promise<void> {
    const res = await fetch(`${ML_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri: ML_REDIRECT_URI,
      }),
    });
    const data = await res.json() as any;
    if (!data.access_token) throw new Error(data.message || 'Token inválido');

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

  async syncProductStock(productId: number): Promise<{ ok: boolean; message: string }> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) return { ok: false, message: 'Produto não encontrado' };
    if (!product.mlItemId) return { ok: false, message: 'Produto sem MLB vinculado' };

    const accessToken = await this.getValidToken();
    const res = await fetch(`${ML_API}/items/${product.mlItemId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ available_quantity: product.currentStock }),
    });
    const data = await res.json() as any;
    if (!res.ok) return { ok: false, message: data.message || 'Erro na API do ML' };
    return { ok: true, message: `Estoque do anúncio ${product.mlItemId} atualizado para ${product.currentStock}` };
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
      if (!mlItemId) continue;
      const product = await this.productRepo.findOne({ where: { mlItemId } });
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
