import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MlToken } from './ml-token.entity';
import { Product } from '../products/product.entity';
import { MercadoLivreService } from './mercadolivre.service';
import { MercadoLivreController } from './mercadolivre.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [TypeOrmModule.forFeature([MlToken, Product]), StockModule],
  providers: [MercadoLivreService],
  controllers: [MercadoLivreController],
})
export class MercadoLivreModule {}
