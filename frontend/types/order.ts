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
    paymentMethod: "CASH_ON_DELIVERY" | "CARD";
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
    paymentMethod: "CASH_ON_DELIVERY" | "CARD";
    paymentStatus: "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
    orderStatus:
        | "PENDING"
        | "CONFIRMED"
        | "PREPARING"
        | "SHIPPED"
        | "DELIVERED"
        | "CANCELLED";
};
