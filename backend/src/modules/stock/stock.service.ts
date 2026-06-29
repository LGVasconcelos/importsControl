import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement, MovementType } from './stock-movement.entity';
import { Product } from '../products/product.entity';
import { CreateMovementDto } from './dto/movement.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async createMovement(dto: CreateMovementDto, userId: number): Promise<StockMovement> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const stockBefore = product.currentStock;
    let stockAfter: number;

    if (dto.type === MovementType.ENTRY) {
      stockAfter = stockBefore + dto.quantity;
    } else if (dto.type === MovementType.EXIT) {
      if (stockBefore < dto.quantity) {
        throw new BadRequestException('Estoque insuficiente para saída');
      }
      stockAfter = stockBefore - dto.quantity;
    } else {
      stockAfter = dto.quantity;
    }

    await this.productRepo.update(dto.productId, { currentStock: stockAfter });

    const movement = this.movementRepo.create({
      ...dto,
      stockBefore,
      stockAfter,
      userId,
    });

    return this.movementRepo.save(movement);
  }

  findAll(productId?: number): Promise<StockMovement[]> {
    const where = productId ? { productId } : {};
    return this.movementRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  findByProduct(productId: number): Promise<StockMovement[]> {
    return this.movementRepo.find({ where: { productId }, order: { createdAt: 'DESC' } });
  }
}
