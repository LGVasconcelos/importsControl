import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Cost } from '../costs/cost.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Cost]), StockModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
