export type PaymentMethod = "CASH_ON_DELIVERY" | "CARD";

export type PaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED";

export type OrderStatus =
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";

export type CreateOrderItem = {
    variantId: string;
    quantity: number;
};

export type CreateOrderPayload = {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryNotes?: string;
    paymentMethod: PaymentMethod;
    items: CreateOrderItem[];
};

export type CreatedOrder = {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryNotes: string | null;
    subtotal: number;
    deliveryFee: number;
    total: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
};

export type AdminOrderItem = {
    id: string;
    orderId: string;
    productId: string | null;
    variantId: string | null;
    productReference: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
};

export type AdminOrderPayment = {
    id: string;
    orderId: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    transactionReference: string | null;
    paidAt: string | null;
    createdAt: string;
};

export type AdminOrderCustomer = {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    createdAt: string;
    updatedAt: string;
};

export type AdminOrder = CreatedOrder & {
    customerId: string | null;
    createdAt: string;
    updatedAt: string;
    customer: AdminOrderCustomer | null;
    items: AdminOrderItem[];
    payment: AdminOrderPayment | null;
};

export type TrackedOrder = AdminOrder;
