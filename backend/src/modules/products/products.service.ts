import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
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
}
