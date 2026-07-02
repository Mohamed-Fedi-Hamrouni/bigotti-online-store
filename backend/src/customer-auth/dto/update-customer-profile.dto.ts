import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  email: string;
}
