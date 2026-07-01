import { IsInt, IsString, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
