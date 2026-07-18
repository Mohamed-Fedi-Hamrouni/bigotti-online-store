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
export const FULFILLMENT_METHODS = ['DELIVERY'] as const;

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

  @IsIn(FULFILLMENT_METHODS)
  fulfillmentMethod!: (typeof FULFILLMENT_METHODS)[number];

  @IsString()
  @MinLength(3)
  deliveryAddress!: string;

  @IsString()
  @MinLength(2)
  deliveryCity!: string;

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
