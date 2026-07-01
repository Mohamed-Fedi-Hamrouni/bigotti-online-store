import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductVariantDto {
  @IsString()
  color!: string;

  @IsString()
  size!: string;

  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @IsOptional()
  @IsString()
  sku?: string;
}
