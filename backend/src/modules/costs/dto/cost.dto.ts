import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

const toNum = ({ value }: { value: any }) => Number(value);

export class CreateCostDto {
  @Transform(toNum) @IsNumber()
  orderId: number;

  @IsString() @IsNotEmpty()
  description: string;

  @Transform(toNum) @IsNumber()
  value: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @Transform(toNum) @IsNumber()
  exchangeRate?: number;

  @IsOptional() @Transform(toNum) @IsNumber()
  valueInBrl?: number;

  @IsOptional() @IsString()
  costType?: string;

  @IsOptional() @IsString()
  notes?: string;
}
