import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toLowerCase(),
  )
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email!: string;

  @IsString({ message: 'Le mot de passe est obligatoire.' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire.' })
  @MinLength(6, {
    message: 'Le mot de passe doit contenir au moins 6 caractères.',
  })
  password!: string;
}
