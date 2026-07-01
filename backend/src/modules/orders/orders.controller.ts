import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderStatus } from './order.entity';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('sync-costs')
  syncCosts(@Body() body: { force?: boolean }) {
    return this.ordersService.syncCosts(body?.force);
  }

  @Post('fix-tracking')
  fixTracking() {
    return this.ordersService.fixConcatenatedTracking();
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req: any) {
    return this.ordersService.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto, @Request() req: any) {
    return this.ordersService.update(id, dto, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: OrderStatus, @Request() req: any) {
    return this.ordersService.updateStatus(id, status, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}
