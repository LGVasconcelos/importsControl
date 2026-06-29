import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

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

  @IsOptional() @IsNumber()
  costPrice?: number;

  @IsOptional() @IsNumber()
  salePrice?: number;

  @IsOptional() @IsNumber() @Min(0)
  minimumStock?: number;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  ncm?: string;
}

export class UpdateProductDto extends CreateProductDto {
  @IsOptional() @IsBoolean()
  active?: boolean;
}
