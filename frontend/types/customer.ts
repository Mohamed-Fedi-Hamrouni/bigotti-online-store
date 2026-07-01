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
