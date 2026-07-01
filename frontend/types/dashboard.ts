export type DashboardSummary = {
    totalRevenue: number;
    ordersCount: number;
    pendingOrdersCount: number;
    confirmedOrdersCount: number;
    deliveredOrdersCount: number;
    paidOrdersCount: number;
    unpaidOrdersCount: number;
    productsCount: number;
    publishedProductsCount: number;
};

export type DashboardBestSeller = {
    productReference: string;
    productName: string;
    quantitySold: number;
    revenue: number;
};

export type DashboardSalesByCategory = {
    categoryName: string;
    categorySlug: string;
    quantitySold: number;
    revenue: number;
};

export type DashboardLowStockProduct = {
    id?: string;
    productId?: string;
    productName?: string;
    productReference?: string;
    color?: string;
    size: string;
    stockQuantity: number;
};

export type DashboardLatestOrder = {
    orderNumber: string;
    customerName: string;
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
    itemsCount: number;
};

export type ManagerDashboard = {
    summary: DashboardSummary;
    bestSellers: DashboardBestSeller[];
    salesByCategory: DashboardSalesByCategory[];
    lowStockProducts: DashboardLowStockProduct[];
    latestOrders: DashboardLatestOrder[];
};
