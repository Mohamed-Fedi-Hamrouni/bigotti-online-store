import { IsString, MinLength } from 'class-validator';

export class ChangeCustomerPasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
