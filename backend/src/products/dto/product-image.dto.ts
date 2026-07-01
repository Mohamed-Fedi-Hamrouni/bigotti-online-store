import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductImageDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  storagePath?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
