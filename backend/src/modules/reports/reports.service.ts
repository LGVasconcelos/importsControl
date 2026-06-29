import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { StockMovement, MovementType } from '../stock/stock-movement.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { Cost } from '../costs/cost.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Cost) private readonly costRepo: Repository<Cost>,
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
}
