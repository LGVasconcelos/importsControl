import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCostDto {
  @IsNumber()
  orderId: number;

  @IsString() @IsNotEmpty()
  description: string;

  @IsNumber()
  value: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsNumber()
  exchangeRate?: number;

  @IsOptional() @IsNumber()
  valueInBrl?: number;

  @IsOptional() @IsString()
  costType?: string;

  @IsOptional() @IsString()
  notes?: string;
}
