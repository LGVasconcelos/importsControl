import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CostsModule } from './modules/costs/costs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ImportModule } from './modules/import/import.module';
import { MercadoLivreModule } from './modules/mercadolivre/mercadolivre.module';
import { MlToken } from './modules/mercadolivre/ml-token.entity';
import { User } from './modules/users/user.entity';
import { Product } from './modules/products/product.entity';
import { StockMovement } from './modules/stock/stock-movement.entity';
import { Order } from './modules/orders/order.entity';
import { OrderItem } from './modules/orders/order-item.entity';
import { Cost } from './modules/costs/cost.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      entities: [User, Product, StockMovement, Order, OrderItem, Cost, MlToken],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    StockModule,
    OrdersModule,
    CostsModule,
    ReportsModule,
    ImportModule,
    MercadoLivreModule,
  ],
})
export class AppModule {}
