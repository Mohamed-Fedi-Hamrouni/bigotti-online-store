export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
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
  confirmNewPassword: string;
};

export type UpdateAdminProfilePayload = { fullName: string };

export type MessageResponse = {
  message: string;
};

export type CreateInternalUserPayload = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};
