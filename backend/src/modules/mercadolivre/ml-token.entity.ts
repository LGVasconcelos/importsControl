import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('ml_tokens')
export class MlToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'text' })
  refreshToken: string;

  @Column({ length: 50 })
  mlUserId: string;

  @Column({ nullable: true, length: 150 })
  nickname: string;

  @Column({ type: 'bigint' })
  expiresAt: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
