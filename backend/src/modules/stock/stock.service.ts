import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement, MovementType } from './stock-movement.entity';
import { Product } from '../products/product.entity';
import { CreateMovementDto } from './dto/movement.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly productsService: ProductsService,
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

    const saved = await this.movementRepo.save(movement);
    await this.productsService.recalcKitsForComponent(dto.productId);
    return saved;
  }

  findAll(productId?: number): Promise<StockMovement[]> {
    const where = productId ? { productId } : {};
    return this.movementRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  /** Força saída de estoque sem validar quantidade mínima (uso interno: webhooks) */
  async createForcedExit(dto: { productId: number; quantity: number; reason: string; orderReference: string }): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) return;
    const stockBefore = product.currentStock;
    const stockAfter = stockBefore - dto.quantity;
    await this.productRepo.update(dto.productId, { currentStock: stockAfter });
    await this.movementRepo.save(this.movementRepo.create({
      productId: dto.productId,
      type: MovementType.EXIT,
      quantity: dto.quantity,
      reason: dto.reason,
      orderReference: dto.orderReference,
      stockBefore,
      stockAfter,
      userId: null,
    }));
    await this.productsService.recalcKitsForComponent(dto.productId);
  }

  findByProduct(productId: number): Promise<StockMovement[]> {
    return this.movementRepo.find({ where: { productId }, order: { createdAt: 'DESC' } });
  }

  async existsByOrderReference(orderReference: string): Promise<boolean> {
    const count = await this.movementRepo.count({ where: { orderReference } });
    return count > 0;
  }

  /** Reverte todos os movimentos ML (orderReference = 'ML-*'), restaurando o estoque */
  async revertMlMovements(): Promise<{ reverted: number; details: string[] }> {
    const mlMovements = await this.movementRepo
      .createQueryBuilder('m')
      .where("m.orderReference LIKE 'ML-%'")
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    if (!mlMovements.length) return { reverted: 0, details: ['Nenhum movimento ML encontrado'] };

    const details: string[] = [];
    const affectedProductIds = new Set<number>();
    for (const mv of mlMovements) {
      // Reverte: saídas viram entradas (devolve estoque)
      const product = await this.productRepo.findOne({ where: { id: mv.productId } });
      if (!product) continue;
      if (mv.type === MovementType.EXIT) {
        await this.productRepo.update(mv.productId, { currentStock: product.currentStock + mv.quantity });
        details.push(`+${mv.quantity} em produto #${mv.productId} (${mv.orderReference})`);
        affectedProductIds.add(mv.productId);
      }
      await this.movementRepo.delete(mv.id);
    }

    for (const productId of affectedProductIds) {
      await this.productsService.recalcKitsForComponent(productId);
    }

    return { reverted: mlMovements.length, details };
  }
}
