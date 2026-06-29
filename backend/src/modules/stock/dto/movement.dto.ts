import { IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { MovementType } from '../stock-movement.entity';

export class CreateMovementDto {
  @IsNumber()
  productId: number;

  @IsEnum(MovementType)
  type: MovementType;

  @IsNumber() @Min(1)
  quantity: number;

  @IsOptional() @IsString()
  reason?: string;

  @IsOptional() @IsString()
  orderReference?: string;
}
