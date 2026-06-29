import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cost } from './cost.entity';
import { CostsService } from './costs.service';
import { CostsController } from './costs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cost])],
  providers: [CostsService],
  controllers: [CostsController],
  exports: [CostsService],
})
export class CostsModule {}
