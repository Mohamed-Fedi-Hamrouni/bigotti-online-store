export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = {
  user: AuthUser;
};

export type GoogleAdminLoginPayload = {
  credential: string;
};

export type ChangeAdminPasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type MessageResponse = {
  message: string;
};

export type CreateInternalUserPayload = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};
