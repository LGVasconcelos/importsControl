import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Product } from '../products/product.entity';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), MulterModule.register()],
  providers: [ImportService],
  controllers: [ImportController],
})
export class ImportModule {}
