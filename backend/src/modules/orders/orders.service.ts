import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { Cost } from '../costs/cost.entity';

const AUTO_COST_MARKER = '__auto__';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Cost)
    private readonly costRepo: Repository<Cost>,
  ) {}

  async create(dto: CreateOrderDto, userId: number): Promise<Order> {
    const existing = await this.orderRepo.findOne({ where: { orderNumber: dto.orderNumber } });
    if (existing) throw new ConflictException(`Pedido '${dto.orderNumber}' já existe`);
    const { items, ...orderData } = dto;
    const order = this.orderRepo.create({ ...orderData, userId });
    const saved = await this.orderRepo.save(order);

    if (items?.length) {
      const newItems = items.map(i => this.orderItemRepo.create({
        orderId: saved.id,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice ?? 0,
        totalPrice: Number(i.quantity) * Number(i.unitPrice ?? 0),
        notes: i.notes,
      }));
      await this.orderItemRepo.save(newItems);
    }

    if (Number(saved.totalValue) > 0) {
      const valueInBrl = saved.currency === 'BRL'
        ? Number(saved.totalValue)
        : Number(saved.totalValue) * Number(saved.exchangeRate);
      await this.costRepo.save(this.costRepo.create({
        orderId: saved.id,
        description: `Valor do Pedido - ${saved.orderNumber}`,
        value: Number(saved.totalValue),
        currency: saved.currency,
        exchangeRate: Number(saved.exchangeRate),
        valueInBrl,
        costType: 'Compra de Estoque',
        notes: AUTO_COST_MARKER,
      }));
    }

    return this.findOne(saved.id);
  }

  findAll(): Promise<Order[]> {
    return this.orderRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    await this.findOne(id);
    const { items, ...orderData } = dto;
    await this.orderRepo.update(id, orderData);
    const updated = await this.findOne(id);

    if (items !== undefined) {
      await this.orderItemRepo.delete({ orderId: id });
      if (items.length > 0) {
        const newItems = items.map(i => this.orderItemRepo.create({
          orderId: id,
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice ?? 0,
          totalPrice: Number(i.quantity) * Number(i.unitPrice ?? 0),
          notes: i.notes,
        }));
        await this.orderItemRepo.save(newItems);
      }
    }

    // Atualiza o custo automático se totalValue/currency/exchangeRate mudaram
    const autoCost = await this.costRepo.findOne({ where: { orderId: id, notes: AUTO_COST_MARKER } });
    if (autoCost) {
      if (Number(updated.totalValue) > 0) {
        const valueInBrl = updated.currency === 'BRL'
          ? Number(updated.totalValue)
          : Number(updated.totalValue) * Number(updated.exchangeRate);
        await this.costRepo.update(autoCost.id, {
          description: `Valor do Pedido - ${updated.orderNumber}`,
          value: Number(updated.totalValue),
          currency: updated.currency,
          exchangeRate: Number(updated.exchangeRate),
          valueInBrl,
        });
      } else {
        await this.costRepo.delete(autoCost.id);
      }
    } else if (Number(updated.totalValue) > 0) {
      // Pedido criado antes desta feature — cria o custo agora
      const valueInBrl = updated.currency === 'BRL'
        ? Number(updated.totalValue)
        : Number(updated.totalValue) * Number(updated.exchangeRate);
      await this.costRepo.save(this.costRepo.create({
        orderId: id,
        description: `Valor do Pedido - ${updated.orderNumber}`,
        value: Number(updated.totalValue),
        currency: updated.currency,
        exchangeRate: Number(updated.exchangeRate),
        valueInBrl,
        costType: 'Compra de Estoque',
        notes: AUTO_COST_MARKER,
      }));
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.orderItemRepo.delete({ orderId: id });
    await this.costRepo.delete({ orderId: id });
    await this.orderRepo.delete(id);
    return { message: 'Pedido removido com sucesso' };
  }
}
