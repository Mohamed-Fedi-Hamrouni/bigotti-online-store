import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductImageDto } from './product-image.dto';
import { ProductVariantDto } from './product-variant.dto';

export const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  reference!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  categoryTypeId?: string;

  @IsOptional()
  @IsString()
  collectionId?: string;

  @IsOptional()
  @IsString()
  saleCampaignId?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsDateString()
  discountStartDate?: string;

  @IsOptional()
  @IsDateString()
  discountEndDate?: string;

  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnSale?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants!: ProductVariantDto[];
}
