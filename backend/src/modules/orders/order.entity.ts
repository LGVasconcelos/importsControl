import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  CUSTOMS = 'CUSTOMS',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  orderNumber: string;

  @Column({ length: 150 })
  supplier: string;

  @Column({ length: 100, nullable: true })
  origin: string;

  @Column({ type: 'varchar', default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'date', nullable: true })
  orderDate: string;

  @Column({ type: 'date', nullable: true })
  expectedArrival: string;

  @Column({ type: 'date', nullable: true })
  actualArrival: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalValue: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  exchangeRate: number;

  @Column({ nullable: true, length: 100 })
  invoiceNumber: string;

  @Column({ nullable: true, type: 'text' })
  trackingCode: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
