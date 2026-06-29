import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from '../orders/order.entity';

@Entity('costs')
export class Cost {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, { eager: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: number;

  @Column({ length: 100 })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  value: number;

  @Column({ length: 10, default: 'BRL' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  exchangeRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valueInBrl: number;

  @Column({ length: 50, nullable: true })
  costType: string;

  @Column({ nullable: true, length: 200 })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
