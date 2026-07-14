import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class ProductImageDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  storagePath?: string | null;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'colorHex must be a valid hex color like #000000.',
  })
  colorHex?: string | null;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
