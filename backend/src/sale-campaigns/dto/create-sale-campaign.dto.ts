import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export const SALE_CAMPAIGN_TYPES = [
  'REMISE_POURCENTAGE',
  'REMISE_MONTANT_FIXE',
  'ACHETEZ_X_OBTENEZ_Y',
  'EVENEMENT_SIMPLE',
] as const;

export const CAMPAIGN_MEDIA_TYPES = ['IMAGE', 'VIDEO'] as const;

export class CreateSaleCampaignDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(SALE_CAMPAIGN_TYPES)
  type?: (typeof SALE_CAMPAIGN_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  buyQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  freeQuantity?: number;

  @IsOptional()
  @IsBoolean()
  displayOnHome?: boolean;

  @IsOptional()
  @IsString()
  heroTitle?: string;

  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @IsOptional()
  @IsIn(CAMPAIGN_MEDIA_TYPES)
  mediaType?: (typeof CAMPAIGN_MEDIA_TYPES)[number];

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaPath?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}
