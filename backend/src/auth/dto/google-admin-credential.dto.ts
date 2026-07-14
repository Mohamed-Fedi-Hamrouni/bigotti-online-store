import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleAdminCredentialDto {
  @IsString()
  @MinLength(100)
  @MaxLength(5000)
  credential!: string;
}
