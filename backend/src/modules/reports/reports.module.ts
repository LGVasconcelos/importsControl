import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { StockMovement } from '../stock/stock-movement.entity';
import { Order } from '../orders/order.entity';
import { Cost } from '../costs/cost.entity';
import { ProductListingPause } from '../mercadolivre/product-listing-pause.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, StockMovement, Order, Cost, ProductListingPause])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
