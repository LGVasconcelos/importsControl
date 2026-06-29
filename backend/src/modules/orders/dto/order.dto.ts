import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { OrderStatus } from '../order.entity';

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
}

export class UpdateOrderDto extends CreateOrderDto {}
