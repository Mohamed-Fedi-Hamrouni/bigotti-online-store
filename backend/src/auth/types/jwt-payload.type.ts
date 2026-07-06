export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

export type JwtPayload = {
  sub: string;
  email: string;
  role: AdminRole;
  tokenType: 'admin';
  iat?: number;
  exp?: number;
};
