import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Le token de réinitialisation est obligatoire.' })
  @IsNotEmpty({ message: 'Le token de réinitialisation est obligatoire.' })
  @MinLength(32, { message: 'Token de réinitialisation invalide.' })
  token!: string;

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

  @IsString({ message: 'La confirmation du mot de passe est obligatoire.' })
  @IsNotEmpty({ message: 'La confirmation du mot de passe est obligatoire.' })
  confirmPassword!: string;
}
