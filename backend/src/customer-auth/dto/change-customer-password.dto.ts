import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangeCustomerPasswordDto {
  @IsString({ message: 'Le mot de passe actuel est obligatoire.' })
  @IsNotEmpty({ message: 'Le mot de passe actuel est obligatoire.' })
  @MinLength(6, {
    message: 'Le mot de passe actuel doit contenir au moins 6 caractères.',
  })
  currentPassword!: string;

  @IsString({ message: 'Le nouveau mot de passe est obligatoire.' })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est obligatoire.' })
  @MinLength(8, {
    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
  })
  @MaxLength(128, {
    message: 'Le nouveau mot de passe ne doit pas dépasser 128 caractères.',
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message:
      'Le nouveau mot de passe doit contenir au moins une lettre et un chiffre.',
  })
  newPassword!: string;
}
