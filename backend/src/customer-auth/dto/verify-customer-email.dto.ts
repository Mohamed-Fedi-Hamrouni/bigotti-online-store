import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyCustomerEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token!: string;
}
