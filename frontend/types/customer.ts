import type { AdminOrder } from "@/types/order";

export type Customer = {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type CustomerAuthResponse = {
    accessToken: string;
    customer: Customer;
};

export type RegisterCustomerPayload = {
    fullName: string;
    phone: string;
    email: string;
    password: string;
};

export type LoginCustomerPayload = {
    email: string;
    password: string;
};

export type UpdateCustomerProfilePayload = {
    fullName: string;
    phone: string;
    email: string;
};

export type ChangeCustomerPasswordPayload = {
    currentPassword: string;
    newPassword: string;
};

export type ChangeCustomerPasswordResponse = {
    message: string;
};

export type AdminCustomer = Customer & {
    orders: AdminOrder[];
    ordersCount: number;
    totalSpent: number | string;
    lastOrderAt: string | null;
};
