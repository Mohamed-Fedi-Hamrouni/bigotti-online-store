import type { AdminOrder } from "@/types/order";

export type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  emailVerifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAuthResponse = {
  customer: Customer;
};

export type CustomerRegistrationResponse = {
  message: string;
  email: string;
};

export type CustomerEmailVerificationResponse = { message: string };

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

export type GoogleCustomerLoginPayload = {
  credential: string;
};

export type GoogleCustomerRegisterPayload = GoogleCustomerLoginPayload & {
  phone: string;
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
