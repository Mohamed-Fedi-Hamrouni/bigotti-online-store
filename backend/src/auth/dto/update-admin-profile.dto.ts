import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAdminProfileDto {
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .replace(/\s+/g, ' '),
  )
  @IsString({ message: 'Le nom complet est obligatoire.' })
  @IsNotEmpty({ message: 'Le nom complet est obligatoire.' })
  @MinLength(2, {
    message: 'Le nom complet doit contenir au moins 2 caractères.',
  })
  @MaxLength(120, {
    message: 'Le nom complet ne doit pas dépasser 120 caractères.',
  })
  fullName!: string;
}
