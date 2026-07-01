import { SetMetadata } from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.type';

export const ROLES_KEY = 'roles';

export type AppRole = JwtPayload['role'];

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
