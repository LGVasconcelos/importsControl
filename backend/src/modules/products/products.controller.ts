import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateKitItemDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.productsService.findAll(search);
  }

  @Get('low-stock')
  findLowStock() {
    return this.productsService.findLowStock();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  // ── Kit endpoints ──────────────────────────────────────────────────────────

  @Get(':id/kit-items')
  getKitItems(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.getKitItems(id);
  }

  @Post(':id/kit-items')
  addKitItem(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateKitItemDto) {
    return this.productsService.addKitItem(id, dto);
  }

  @Delete('kit-items/:kitItemId')
  removeKitItem(@Param('kitItemId', ParseIntPipe) kitItemId: number) {
    return this.productsService.removeKitItem(kitItemId);
  }
}
