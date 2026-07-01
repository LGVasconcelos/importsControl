import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OrderStatus } from '../order.entity';

const toNum = ({ value }: { value: any }) => value !== undefined && value !== '' ? Number(value) : value;
const toDate = ({ value }: { value: any }) => (value === '' || value === null) ? undefined : value;

export class OrderItemDto {
  @Transform(toNum) @IsNumber()
  productId: number;

  @Transform(toNum) @IsNumber()
  quantity: number;

  @IsOptional() @Transform(toNum) @IsNumber()
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

  @IsOptional() @Transform(toDate) @IsDateString()
  orderDate?: string;

  @IsOptional() @Transform(toDate) @IsDateString()
  expectedArrival?: string;

  @IsOptional() @Transform(toDate) @IsDateString()
  actualArrival?: string;

  @IsOptional() @Transform(toNum) @IsNumber()
  totalValue?: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @Transform(toNum) @IsNumber()
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

export class UpdateOrderDto {
  @IsOptional() @IsString() @IsNotEmpty()
  orderNumber?: string;

  @IsOptional() @IsString() @IsNotEmpty()
  supplier?: string;

  @IsOptional() @IsString()
  origin?: string;

  @IsOptional() @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional() @Transform(toDate) @IsDateString()
  orderDate?: string;

  @IsOptional() @Transform(toDate) @IsDateString()
  expectedArrival?: string;

  @IsOptional() @Transform(toDate) @IsDateString()
  actualArrival?: string;

  @IsOptional() @Transform(toNum) @IsNumber()
  totalValue?: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @Transform(toNum) @IsNumber()
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
