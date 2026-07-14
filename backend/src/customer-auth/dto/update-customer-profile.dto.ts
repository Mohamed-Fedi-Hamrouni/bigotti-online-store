import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCustomerProfileDto {
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
}
