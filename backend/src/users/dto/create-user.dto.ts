import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export const INTERNAL_USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;

export type InternalUserRole = (typeof INTERNAL_USER_ROLES)[number];

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(INTERNAL_USER_ROLES)
  role!: InternalUserRole;
}
