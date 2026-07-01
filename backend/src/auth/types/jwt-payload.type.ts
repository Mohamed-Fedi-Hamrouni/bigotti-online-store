export type JwtPayload = {
  sub: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';
};
