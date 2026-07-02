export type DashboardSummary = {
    totalRevenue: number;
    ordersCount: number;
    pendingOrdersCount: number;
    confirmedOrdersCount: number;
    preparingOrdersCount: number;
    shippedOrdersCount: number;
    deliveredOrdersCount: number;
    cancelledOrdersCount: number;
    paidOrdersCount: number;
    unpaidOrdersCount: number;
    productsCount: number;
    publishedProductsCount: number;
    draftProductsCount: number;
    archivedProductsCount: number;
    customersCount: number;
    activeCustomersCount: number;
    inactiveCustomersCount: number;
    lowStockVariantsCount: number;
    outOfStockVariantsCount: number;
};

export type DashboardBestSeller = {
    productId: string;
    productReference: string;
    productName: string;
    categoryName: string;
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
    variantId: string;
    productId: string;
    productName: string;
    productReference: string;
    categoryName: string;
    color: string;
    size: string;
    stockQuantity: number;
    sku: string | null;
};

export type DashboardLatestOrder = {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
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
    createdAt: string;
    itemsCount: number;
};

export type ManagerDashboard = {
    summary: DashboardSummary;
    bestSellers: DashboardBestSeller[];
    salesByCategory: DashboardSalesByCategory[];
    lowStockProducts: DashboardLowStockProduct[];
    latestOrders: DashboardLatestOrder[];
};
