import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class ResendCustomerVerificationDto {
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toLowerCase(),
  )
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email!: string;
}
