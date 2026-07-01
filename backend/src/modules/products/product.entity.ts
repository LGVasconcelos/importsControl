import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  sku: string;

  @Column({ length: 200 })
  name: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ length: 100, nullable: true })
  origin: string;

  @Column({ length: 150, nullable: true })
  supplier: string;

  @Column({ length: 20, default: 'UN' })
  unit: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  salePrice: number;

  @Column({ type: 'int', default: 0 })
  currentStock: number;

  @Column({ type: 'int', default: 0 })
  minimumStock: number;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true, length: 100 })
  category: string;

  @Column({ nullable: true, length: 50 })
  ncm: string;

  @Column({ nullable: true, type: 'text' })
  mlItemId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
