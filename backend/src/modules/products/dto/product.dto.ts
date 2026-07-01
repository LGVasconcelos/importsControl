import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const toNum = ({ value }: { value: any }) => value !== undefined && value !== '' ? Number(value) : value;

export class CreateProductDto {
  @IsString() @IsNotEmpty()
  sku: string;

  @IsString() @IsNotEmpty()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  origin?: string;

  @IsOptional() @IsString()
  supplier?: string;

  @IsOptional() @IsString()
  unit?: string;

  @IsOptional() @Transform(toNum) @IsNumber()
  costPrice?: number;

  @IsOptional() @Transform(toNum) @IsNumber()
  salePrice?: number;

  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  minimumStock?: number;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  ncm?: string;

  @IsOptional() @IsString()
  mlItemId?: string;
}

export class UpdateProductDto extends CreateProductDto {
  @IsOptional() @IsBoolean()
  active?: boolean;
}
