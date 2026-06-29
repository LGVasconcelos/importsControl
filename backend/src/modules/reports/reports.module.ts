import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { StockMovement } from '../stock/stock-movement.entity';
import { Order } from '../orders/order.entity';
import { Cost } from '../costs/cost.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, StockMovement, Order, Cost])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
