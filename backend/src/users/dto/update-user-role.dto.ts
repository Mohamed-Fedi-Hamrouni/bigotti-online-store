import { IsIn } from 'class-validator';
import { INTERNAL_USER_ROLES } from './create-user.dto';
import type { InternalUserRole } from './create-user.dto';

export class UpdateUserRoleDto {
  @IsIn(INTERNAL_USER_ROLES)
  role!: InternalUserRole;
}
