import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export const CATEGORY_MENU_GROUPS = [
  'HAUT',
  'BAS',
  'COSTUME_CEREMONIE',
  'CHAUSSURES',
  'ACCESSOIRES',
  'AUTRE',
] as const;

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
  @IsBoolean()
  isActive?: boolean;
}
