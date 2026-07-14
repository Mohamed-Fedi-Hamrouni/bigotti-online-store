import { IsIn } from 'class-validator';
import { PRODUCT_STATUSES } from './create-product.dto';

export class UpdateProductStatusDto {
  @IsIn(PRODUCT_STATUSES)
  status!: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
