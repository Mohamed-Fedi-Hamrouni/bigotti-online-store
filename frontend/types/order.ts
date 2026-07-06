export type PaymentMethod = "CASH_ON_DELIVERY";

export type FulfillmentMethod = "DELIVERY" | "STORE_PICKUP";

export type PickupStore = "NABEUL" | "SFAX" | "LAC_2" | "LAFAYETTE" | "SOUKRA";

export type PaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED";

export type OrderStatus =
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";

export type CreateOrderItemPayload = {
    variantId: string;
    quantity: number;
};

export type CreateOrderPayload = {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    fulfillmentMethod: FulfillmentMethod;
    pickupStore?: PickupStore;
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryNotes?: string;
    paymentMethod: PaymentMethod;
    items: CreateOrderItemPayload[];
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
    subtotal: number | string;
    deliveryFee: number | string;
    total: number | string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    createdAt: string;
    updatedAt: string;
};

export type AdminOrderItem = {
    id: string;
    productId: string;
    productVariantId: string;
    productName: string;
    productReference: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number | string;
    totalPrice: number | string;
};

export type AdminOrderPayment = {
    id: string;
    amount: number | string;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionReference: string | null;
    createdAt: string;
};

export type AdminOrder = {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryNotes: string | null;
    subtotal: number | string;
    deliveryFee: number | string;
    total: number | string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus;
    createdAt: string;
    updatedAt: string;
    items: AdminOrderItem[];
    payments: AdminOrderPayment[];
};

export type TrackedOrder = AdminOrder;
