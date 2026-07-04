import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CATEGORY_MENU_GROUPS, CategoryTypeDto } from './create-category.dto';

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryTypeDto)
  types?: CategoryTypeDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
