import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CATEGORY_MENU_GROUPS } from './create-category.dto';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

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
