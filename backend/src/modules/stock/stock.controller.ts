import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateMovementDto } from './dto/movement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('movement')
  create(@Body() dto: CreateMovementDto, @Request() req: any) {
    return this.stockService.createMovement(dto, req.user.id);
  }

  @Get('movements')
  findAll(@Query('productId') productId?: string) {
    return this.stockService.findAll(productId ? Number(productId) : undefined);
  }

  @Get('movements/product/:id')
  findByProduct(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.findByProduct(id);
  }
}
