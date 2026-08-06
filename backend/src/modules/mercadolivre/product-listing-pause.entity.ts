import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Histórico de pausas/reativações de anúncio no ML por produto, usado para
 * medir tempo de ruptura (relatório de sugestão de reposição). Um evento com
 * reactivatedAt null significa que o anúncio ainda está pausado.
 */
@Entity('product_listing_pauses')
export class ProductListingPause {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column({ type: 'timestamp' })
  pausedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reactivatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
