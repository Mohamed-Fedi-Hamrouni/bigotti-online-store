import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterCustomerDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString({ message: 'Le nom complet est obligatoire.' })
  @IsNotEmpty({ message: 'Le nom complet est obligatoire.' })
  @MinLength(2, {
    message: 'Le nom complet doit contenir au moins 2 caractères.',
  })
  @MaxLength(120, {
    message: 'Le nom complet ne doit pas dépasser 120 caractères.',
  })
  fullName!: string;

  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .replace(/\s+/g, ''),
  )
  @IsString({ message: 'Le téléphone est obligatoire.' })
  @IsNotEmpty({ message: 'Le téléphone est obligatoire.' })
  @Matches(/^\+?[0-9]{8,15}$/, {
    message:
      'Le téléphone doit contenir entre 8 et 15 chiffres, avec + optionnel.',
  })
  phone!: string;

  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toLowerCase(),
  )
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email!: string;

  @IsString({ message: 'Le mot de passe est obligatoire.' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  @MaxLength(128, {
    message: 'Le mot de passe ne doit pas dépasser 128 caractères.',
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
  })
  password!: string;
}
