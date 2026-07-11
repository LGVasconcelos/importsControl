import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('kit_items')
export class KitItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kitProductId: number;

  @Column()
  componentProductId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kitProductId' })
  kitProduct: Product;

  @ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'componentProductId' })
  component: Product;
}
