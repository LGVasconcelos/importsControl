import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from './product.entity';
import { KitItem } from './kit-item.entity';
import { CreateProductDto, UpdateProductDto, CreateKitItemDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(KitItem)
    private readonly kitItemRepo: Repository<KitItem>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException(`SKU '${dto.sku}' já cadastrado`);
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  findAll(search?: string): Promise<Product[]> {
    if (search) {
      return this.productRepo.find({
        where: [{ name: ILike(`%${search}%`) }, { sku: ILike(`%${search}%`) }],
        order: { name: 'ASC' },
      });
    }
    return this.productRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    await this.productRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.productRepo.update(id, { active: false });
    return { message: 'Produto desativado com sucesso' };
  }

  findLowStock(): Promise<Product[]> {
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.currentStock <= p.minimumStock AND p.minimumStock > 0')
      .orderBy('p.name', 'ASC')
      .getMany();
  }

  // ── Kit management ──────────────────────────────────────────────────────────

  async getKitItems(kitProductId: number): Promise<KitItem[]> {
    const product = await this.productRepo.findOne({ where: { id: kitProductId } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return this.kitItemRepo.find({ where: { kitProductId }, order: { id: 'ASC' } });
  }

  async addKitItem(kitProductId: number, dto: CreateKitItemDto): Promise<KitItem> {
    const kit = await this.productRepo.findOne({ where: { id: kitProductId } });
    if (!kit) throw new NotFoundException('Produto kit não encontrado');
    if (!kit.isKit) throw new BadRequestException('Produto não está marcado como kit');

    const component = await this.productRepo.findOne({ where: { id: dto.componentProductId } });
    if (!component) throw new NotFoundException('Produto componente não encontrado');
    if (component.isKit) throw new BadRequestException('Um kit não pode ter outro kit como componente');
    if (dto.componentProductId === kitProductId) throw new BadRequestException('Um kit não pode ser componente de si mesmo');

    const existing = await this.kitItemRepo.findOne({ where: { kitProductId, componentProductId: dto.componentProductId } });
    if (existing) throw new ConflictException('Este componente já está no kit');

    const item = this.kitItemRepo.create({ kitProductId, componentProductId: dto.componentProductId, quantity: dto.quantity });
    const saved = await this.kitItemRepo.save(item);
    await this.recalcKitStock(kitProductId);
    return this.kitItemRepo.findOne({ where: { id: saved.id } }) as Promise<KitItem>;
  }

  async removeKitItem(kitItemId: number): Promise<{ message: string }> {
    const item = await this.kitItemRepo.findOne({ where: { id: kitItemId } });
    if (!item) throw new NotFoundException('Item de kit não encontrado');
    const kitProductId = item.kitProductId;
    await this.kitItemRepo.delete(kitItemId);
    await this.recalcKitStock(kitProductId);
    return { message: 'Componente removido do kit' };
  }

  /** Recalcula o estoque virtual do kit = min(componente.stock / kitItem.qty) */
  async recalcKitStock(kitProductId: number): Promise<void> {
    const items = await this.kitItemRepo.find({ where: { kitProductId } });
    if (!items.length) return;
    const stocks = items.map(i => Math.floor(i.component.currentStock / i.quantity));
    const kitStock = Math.max(0, Math.min(...stocks));
    await this.productRepo.update(kitProductId, { currentStock: kitStock });
  }

  /** Retorna os kit items de um produto kit (acesso direto ao repo, para uso interno) */
  findKitItemsByKitId(kitProductId: number): Promise<KitItem[]> {
    return this.kitItemRepo.find({ where: { kitProductId } });
  }

  /** Recalcula o estoque de todos os kits que usam este produto como componente (uso interno: StockService) */
  async recalcKitsForComponent(componentProductId: number): Promise<void> {
    const kitItems = await this.kitItemRepo.find({ where: { componentProductId } });
    const kitProductIds = [...new Set(kitItems.map(i => i.kitProductId))];
    for (const kitProductId of kitProductIds) {
      await this.recalcKitStock(kitProductId);
    }
  }
}
