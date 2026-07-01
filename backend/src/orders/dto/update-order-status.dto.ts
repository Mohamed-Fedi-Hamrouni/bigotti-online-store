import { IsIn } from 'class-validator';

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  orderStatus!:
    | 'PENDING'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED';
}
