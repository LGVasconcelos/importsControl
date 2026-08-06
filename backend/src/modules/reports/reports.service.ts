import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../products/product.entity';
import { StockMovement, MovementType } from '../stock/stock-movement.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { Cost } from '../costs/cost.entity';
import { ProductListingPause } from '../mercadolivre/product-listing-pause.entity';

// Usado só quando ainda não há pedidos RECEBIDOS suficientes para calcular um
// lead time real (ver getReorderSuggestions) — estimativa grosseira de importação da China.
const FALLBACK_LEAD_TIME_DAYS = 30;

// origin é texto livre (sem cadastro de fornecedor/país estruturado) — identifica
// pedidos nacionais para excluí-los do cálculo de lead time de importação.
const DOMESTIC_ORIGINS = ['brasil', 'brazil', 'br', 'nacional'];
function isDomesticOrigin(origin?: string | null): boolean {
  return DOMESTIC_ORIGINS.includes((origin || '').trim().toLowerCase());
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Cost) private readonly costRepo: Repository<Cost>,
    @InjectRepository(ProductListingPause) private readonly listingPauseRepo: Repository<ProductListingPause>,
  ) {}

  async getDashboard() {
    const totalProducts = await this.productRepo.count({ where: { active: true } });

    const lowStockProducts = await this.productRepo
      .createQueryBuilder('p')
      .where('p.currentStock <= p.minimumStock AND p.minimumStock > 0')
      .getCount();

    const ordersInTransit = await this.orderRepo.count({ where: { status: OrderStatus.IN_TRANSIT } });
    const ordersInCustoms = await this.orderRepo.count({ where: { status: OrderStatus.CUSTOMS } });
    const totalOrders = await this.orderRepo.count();

    const recentMovements = await this.movementRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalProducts,
      lowStockProducts,
      ordersInTransit,
      ordersInCustoms,
      totalOrders,
      recentMovements,
    };
  }

  async getStockReport() {
    return this.productRepo.find({
      where: { active: true },
      order: { name: 'ASC' },
      select: { id: true, sku: true, name: true, currentStock: true, minimumStock: true, unit: true, costPrice: true, category: true },
    });
  }

  async getMovementsReport(from?: string, to?: string) {
    const qb = this.movementRepo.createQueryBuilder('m').orderBy('m.createdAt', 'DESC');
    if (from) qb.andWhere('m.createdAt >= :from', { from });
    if (to) qb.andWhere('m.createdAt <= :to', { to: to + 'T23:59:59' });
    return qb.getMany();
  }

  async getCostReport() {
    const orders = await this.orderRepo.find({ order: { createdAt: 'DESC' } });
    const result = await Promise.all(
      orders.map(async (o) => {
        const costs = await this.costRepo.find({ where: { orderId: o.id } });
        const totalCost = costs.reduce((s, c) => s + Number(c.valueInBrl || c.value), 0);
        return { ...o, costs, totalCost };
      }),
    );
    return result;
  }

  async getOrdersReport() {
    const byStatus = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany();

    const orders = await this.orderRepo.find({ order: { createdAt: 'DESC' } });
    return { byStatus, orders };
  }

  /**
   * Sugestão de reposição de compra: cruza velocidade de venda (stock_movements),
   * lead time médio de importação (orders x recebimento) e histórico de ruptura
   * (product_listing_pauses) para priorizar o que comprar primeiro.
   *
   * Kits (isKit=true) são excluídos: o estoque deles é derivado dos componentes
   * (recalcKitStock), não são comprados diretamente — a ruptura de um kit já
   * aparece no componente que faltou, avaliado individualmente aqui.
   */
  async getReorderSuggestions(coverageDays = 14, lookbackDays = 30) {
    const since = new Date(Date.now() - lookbackDays * 86400000);
    const since90 = new Date(Date.now() - 90 * 86400000);

    // Velocidade de venda: soma de saídas por produto na janela de lookback
    const salesRows = await this.movementRepo
      .createQueryBuilder('m')
      .select('m.productId', 'productId')
      .addSelect('SUM(m.quantity)', 'totalExit')
      .where('m.type = :type', { type: MovementType.EXIT })
      .andWhere('m.createdAt >= :since', { since })
      .groupBy('m.productId')
      .getRawMany();
    const salesMap = new Map<number, number>(
      salesRows.map(r => [Number(r.productId), Number(r.totalExit) / lookbackDays]),
    );

    // Lead time médio (global — volume de pedidos ainda é pequeno demais para
    // confiar num cálculo por fornecedor): tempo entre orderDate e a movimentação
    // de ENTRADA gerada no recebimento (actualArrival nunca é preenchido hoje).
    // Pedidos nacionais (origin Brasil) são excluídos — têm prazo bem mais curto
    // que importação da China e distorceriam a média pra baixo.
    const allReceivedOrders = await this.orderRepo.find({ where: { status: OrderStatus.RECEIVED } });
    const receivedOrders = allReceivedOrders.filter(o => !isDomesticOrigin(o.origin));
    let avgLeadTimeDays = FALLBACK_LEAD_TIME_DAYS;
    if (receivedOrders.length) {
      const orderNumbers = receivedOrders.map(o => o.orderNumber);
      const entryRows = await this.movementRepo
        .createQueryBuilder('m')
        .select('m.orderReference', 'orderReference')
        .addSelect('MIN(m.createdAt)', 'receivedAt')
        .where('m.type = :type', { type: MovementType.ENTRY })
        .andWhere('m.orderReference IN (:...refs)', { refs: orderNumbers })
        .groupBy('m.orderReference')
        .getRawMany();
      const receivedAtMap = new Map<string, Date>(entryRows.map(r => [r.orderReference, new Date(r.receivedAt)]));

      let totalDays = 0, count = 0;
      for (const o of receivedOrders) {
        if (!o.orderDate) continue;
        const receivedAt = receivedAtMap.get(o.orderNumber);
        if (!receivedAt) continue;
        const days = (receivedAt.getTime() - new Date(o.orderDate).getTime()) / 86400000;
        if (days > 0) { totalDays += days; count++; }
      }
      // Com poucos pedidos, a data de "recebido" registrada no sistema nem sempre
      // reflete a chegada física real (lançamento tardio/retroativo) — por isso o
      // cálculo nunca fica abaixo do prazo real conhecido do negócio (FALLBACK_LEAD_TIME_DAYS),
      // só sobe se o histórico indicar um prazo médio pior que isso.
      if (count > 0) avgLeadTimeDays = Math.max(totalDays / count, FALLBACK_LEAD_TIME_DAYS);
    }

    // Ruptura: eventos que tocam os últimos 90 dias (abertos ou fechados nesse período)
    const pauseEvents = await this.listingPauseRepo
      .createQueryBuilder('e')
      .where('e.pausedAt >= :since90', { since90 })
      .orWhere('e.reactivatedAt IS NULL')
      .getMany();

    const now = Date.now();
    const ruptureMap = new Map<number, { episodes: number; days: number }>();
    const openProductIds = new Set<number>();
    for (const ev of pauseEvents) {
      if (!ev.reactivatedAt) openProductIds.add(ev.productId);
      const end = ev.reactivatedAt ? ev.reactivatedAt.getTime() : now;
      const days = Math.max(0, (end - ev.pausedAt.getTime()) / 86400000);
      const cur = ruptureMap.get(ev.productId) || { episodes: 0, days: 0 };
      cur.episodes += 1;
      cur.days += days;
      ruptureMap.set(ev.productId, cur);
    }

    // Estoque já a caminho: itens de pedidos ainda não recebidos (nem cancelados),
    // pra não sugerir comprar de novo algo que já foi pedido e está em trânsito/despacho.
    const incomingOrders = await this.orderRepo.find({
      where: { status: In([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.IN_TRANSIT, OrderStatus.CUSTOMS]) },
    });
    const incomingMap = new Map<number, number>();
    for (const o of incomingOrders) {
      for (const item of o.items || []) {
        incomingMap.set(item.productId, (incomingMap.get(item.productId) || 0) + Number(item.quantity));
      }
    }

    const products = await this.productRepo.find({ where: { active: true, isKit: false } });

    const suggestions = products.map(p => {
      const avgDailySales = salesMap.get(p.id) || 0;
      const rupture = ruptureMap.get(p.id) || { episodes: 0, days: 0 };
      const incomingQty = incomingMap.get(p.id) || 0;
      const daysUntilStockout = avgDailySales > 0 ? p.currentStock / avgDailySales : null;
      const suggestedReorderQty = avgDailySales > 0
        ? Math.max(0, Math.ceil(avgDailySales * (avgLeadTimeDays + coverageDays) - p.currentStock - incomingQty))
        : 0;

      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        currentStock: p.currentStock,
        minimumStock: p.minimumStock,
        incomingQty,
        avgDailySales: Number(avgDailySales.toFixed(2)),
        avgLeadTimeDays: Number(avgLeadTimeDays.toFixed(1)),
        daysUntilStockout: daysUntilStockout !== null ? Number(daysUntilStockout.toFixed(1)) : null,
        ruptureEpisodes90d: rupture.episodes,
        ruptureDaysTotal90d: Number(rupture.days.toFixed(1)),
        isCurrentlyPaused: openProductIds.has(p.id),
        suggestedReorderQty,
      };
    });

    suggestions.sort((a, b) => {
      if (a.isCurrentlyPaused !== b.isCurrentlyPaused) return a.isCurrentlyPaused ? -1 : 1;
      const aDays = a.daysUntilStockout ?? Infinity;
      const bDays = b.daysUntilStockout ?? Infinity;
      if (aDays !== bDays) return aDays - bDays;
      return b.ruptureDaysTotal90d - a.ruptureDaysTotal90d;
    });

    return suggestions;
  }
}
