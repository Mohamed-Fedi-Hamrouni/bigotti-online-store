import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export const PAYMENT_METHODS = ['CASH_ON_DELIVERY'] as const;
export const FULFILLMENT_METHODS = ['DELIVERY', 'STORE_PICKUP'] as const;
export const PICKUP_STORES = [
  'NABEUL',
  'SFAX',
  'LAC_2',
  'LAFAYETTE',
  'SOUKRA',
] as const;

export class CreateOrderDto {
  @IsString()
  @MinLength(2)
  customerName!: string;

  @IsString()
  @MinLength(8)
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsIn(FULFILLMENT_METHODS)
  fulfillmentMethod?: (typeof FULFILLMENT_METHODS)[number];

  @IsOptional()
  @IsIn(PICKUP_STORES)
  pickupStore?: (typeof PICKUP_STORES)[number];

  @IsOptional()
  @IsString()
  @MinLength(3)
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  deliveryCity?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: 'CASH_ON_DELIVERY';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
