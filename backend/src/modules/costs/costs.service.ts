import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cost } from './cost.entity';
import { CreateCostDto } from './dto/cost.dto';

@Injectable()
export class CostsService {
  constructor(
    @InjectRepository(Cost)
    private readonly costRepo: Repository<Cost>,
  ) {}

  async create(dto: CreateCostDto): Promise<Cost> {
    if (!dto.valueInBrl && dto.exchangeRate) {
      dto.valueInBrl = dto.value * dto.exchangeRate;
    }
    const cost = this.costRepo.create(dto);
    return this.costRepo.save(cost);
  }

  findAll(orderId?: number): Promise<Cost[]> {
    const where = orderId ? { orderId } : {};
    return this.costRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  findByOrder(orderId: number): Promise<Cost[]> {
    return this.costRepo.find({ where: { orderId }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: number): Promise<Cost> {
    const cost = await this.costRepo.findOne({ where: { id } });
    if (!cost) throw new NotFoundException('Custo não encontrado');
    return cost;
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.costRepo.delete(id);
    return { message: 'Custo removido com sucesso' };
  }

  async getTotalByOrder(orderId: number) {
    const costs = await this.findByOrder(orderId);
    const total = costs.reduce((sum, c) => sum + Number(c.valueInBrl || c.value), 0);
    return { orderId, totalBrl: total, costs };
  }
}
