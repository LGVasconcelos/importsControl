import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(dto: CreateOrderDto, userId: number): Promise<Order> {
    const existing = await this.orderRepo.findOne({ where: { orderNumber: dto.orderNumber } });
    if (existing) throw new ConflictException(`Pedido '${dto.orderNumber}' já existe`);
    const order = this.orderRepo.create({ ...dto, userId });
    return this.orderRepo.save(order);
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
    await this.orderRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.orderRepo.delete(id);
    return { message: 'Pedido removido com sucesso' };
  }
}
