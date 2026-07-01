export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER";

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
    accessToken: string;
    user: AuthUser;
};
