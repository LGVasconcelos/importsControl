import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../order.entity';

export class OrderItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsOptional() @IsNumber()
  unitPrice?: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty()
  orderNumber: string;

  @IsString() @IsNotEmpty()
  supplier: string;

  @IsOptional() @IsString()
  origin?: string;

  @IsOptional() @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional() @IsDateString()
  orderDate?: string;

  @IsOptional() @IsDateString()
  expectedArrival?: string;

  @IsOptional() @IsDateString()
  actualArrival?: string;

  @IsOptional() @IsNumber()
  totalValue?: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsNumber()
  exchangeRate?: number;

  @IsOptional() @IsString()
  invoiceNumber?: string;

  @IsOptional() @IsString()
  trackingCode?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

export class UpdateOrderDto extends CreateOrderDto {}
