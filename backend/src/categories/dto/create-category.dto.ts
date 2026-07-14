import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const CATEGORY_MENU_GROUPS = [
  'HAUT',
  'BAS',
  'COSTUME_CEREMONIE',
  'CHAUSSURES',
  'ACCESSOIRES',
  'AUTRE',
] as const;

export class CategoryTypeDto {
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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateCategoryDto {
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
  @IsIn(CATEGORY_MENU_GROUPS)
  menuGroup?: (typeof CATEGORY_MENU_GROUPS)[number];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryTypeDto)
  types?: CategoryTypeDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
