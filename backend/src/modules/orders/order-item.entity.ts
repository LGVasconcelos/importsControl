import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../products/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column()
  productId: number;

  @ManyToOne('Order', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: any;

  @ManyToOne(() => Product, { eager: true, nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ nullable: true, length: 200 })
  notes: string;
}
