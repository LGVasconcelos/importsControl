import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CostsService } from './costs.service';
import { CreateCostDto } from './dto/cost.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('costs')
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Post()
  create(@Body() dto: CreateCostDto) {
    return this.costsService.create(dto);
  }

  @Get()
  findAll(@Query('orderId') orderId?: string) {
    return this.costsService.findAll(orderId ? Number(orderId) : undefined);
  }

  @Get('order/:orderId/total')
  getTotal(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.costsService.getTotalByOrder(orderId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.costsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.costsService.remove(id);
  }
}
