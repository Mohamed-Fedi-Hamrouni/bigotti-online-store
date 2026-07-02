import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getManagerDashboard() {
    const [
      orders,
      orderItems,
      lowStockVariants,
      latestOrders,
      productsCount,
      publishedProductsCount,
      draftProductsCount,
      archivedProductsCount,
      customersCount,
      activeCustomersCount,
      inactiveCustomersCount,
      lowStockVariantsCount,
      outOfStockVariantsCount,
    ] = await Promise.all([
      this.prisma.order.findMany(),

      this.prisma.orderItem.findMany({
        where: {
          order: {
            orderStatus: {
              not: 'CANCELLED',
            },
          },
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      }),

      this.prisma.productVariant.findMany({
        where: {
          stockQuantity: {
            lte: 5,
          },
          isActive: true,
          product: {
            status: {
              not: 'ARCHIVED',
            },
          },
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          stockQuantity: 'asc',
        },
        take: 12,
      }),

      this.prisma.order.findMany({
        include: {
          items: true,
          payment: true,
          customer: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 6,
      }),

      this.prisma.product.count(),

      this.prisma.product.count({
        where: {
          status: 'PUBLISHED',
        },
      }),

      this.prisma.product.count({
        where: {
          status: 'DRAFT',
        },
      }),

      this.prisma.product.count({
        where: {
          status: 'ARCHIVED',
        },
      }),

      this.prisma.customer.count(),

      this.prisma.customer.count({
        where: {
          isActive: true,
        },
      }),

      this.prisma.customer.count({
        where: {
          isActive: false,
        },
      }),

      this.prisma.productVariant.count({
        where: {
          stockQuantity: {
            gt: 0,
            lte: 5,
          },
          isActive: true,
          product: {
            status: {
              not: 'ARCHIVED',
            },
          },
        },
      }),

      this.prisma.productVariant.count({
        where: {
          stockQuantity: {
            lte: 0,
          },
          isActive: true,
          product: {
            status: {
              not: 'ARCHIVED',
            },
          },
        },
      }),
    ]);

    const activeOrders = orders.filter(
      (order) => order.orderStatus !== 'CANCELLED',
    );

    const totalRevenue = this.toMoney(
      activeOrders.reduce((sum, order) => sum + Number(order.total), 0),
    );

    const pendingOrdersCount = orders.filter(
      (order) => order.orderStatus === 'PENDING',
    ).length;

    const confirmedOrdersCount = orders.filter(
      (order) => order.orderStatus === 'CONFIRMED',
    ).length;

    const preparingOrdersCount = orders.filter(
      (order) => order.orderStatus === 'PREPARING',
    ).length;

    const shippedOrdersCount = orders.filter(
      (order) => order.orderStatus === 'SHIPPED',
    ).length;

    const deliveredOrdersCount = orders.filter(
      (order) => order.orderStatus === 'DELIVERED',
    ).length;

    const cancelledOrdersCount = orders.filter(
      (order) => order.orderStatus === 'CANCELLED',
    ).length;

    const unpaidOrdersCount = orders.filter(
      (order) => order.paymentStatus === 'UNPAID',
    ).length;

    const paidOrdersCount = orders.filter(
      (order) => order.paymentStatus === 'PAID',
    ).length;

    return {
      summary: {
        totalRevenue,
        ordersCount: orders.length,
        pendingOrdersCount,
        confirmedOrdersCount,
        preparingOrdersCount,
        shippedOrdersCount,
        deliveredOrdersCount,
        cancelledOrdersCount,
        paidOrdersCount,
        unpaidOrdersCount,
        productsCount,
        publishedProductsCount,
        draftProductsCount,
        archivedProductsCount,
        customersCount,
        activeCustomersCount,
        inactiveCustomersCount,
        lowStockVariantsCount,
        outOfStockVariantsCount,
      },
      bestSellers: this.getBestSellers(orderItems),
      salesByCategory: this.getSalesByCategory(orderItems),
      lowStockProducts: lowStockVariants.map((variant) => ({
        variantId: variant.id,
        productId: variant.productId,
        productReference: variant.product.reference,
        productName: variant.product.name,
        categoryName: variant.product.category.name,
        color: variant.color,
        size: variant.size,
        stockQuantity: variant.stockQuantity,
        sku: variant.sku,
      })),
      latestOrders: latestOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    };
  }

  private getBestSellers(
    orderItems: Array<{
      productId: string | null;
      productReference: string;
      productName: string;
      quantity: number;
      totalPrice: unknown;
      product: {
        id: string;
        category?: {
          name: string;
        } | null;
      } | null;
    }>,
  ) {
    const map = new Map<
      string,
      {
        productId: string;
        productReference: string;
        productName: string;
        categoryName: string;
        quantitySold: number;
        revenue: number;
      }
    >();

    for (const item of orderItems) {
      const existing = map.get(item.productReference);

      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += Number(item.totalPrice);
      } else {
        map.set(item.productReference, {
          productId: item.productId ?? item.product?.id ?? 'unknown-product',
          productReference: item.productReference,
          productName: item.productName,
          categoryName: item.product?.category?.name ?? 'Sans catégorie',
          quantitySold: item.quantity,
          revenue: Number(item.totalPrice),
        });
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        revenue: this.toMoney(item.revenue),
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 6);
  }

  private getSalesByCategory(
    orderItems: Array<{
      quantity: number;
      totalPrice: unknown;
      product: {
        category?: {
          name: string;
          slug: string;
        } | null;
      } | null;
    }>,
  ) {
    const map = new Map<
      string,
      {
        categoryName: string;
        categorySlug: string;
        quantitySold: number;
        revenue: number;
      }
    >();

    for (const item of orderItems) {
      const categoryName = item.product?.category?.name ?? 'Sans catégorie';
      const categorySlug = item.product?.category?.slug ?? 'sans-categorie';

      const existing = map.get(categorySlug);

      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += Number(item.totalPrice);
      } else {
        map.set(categorySlug, {
          categoryName,
          categorySlug,
          quantitySold: item.quantity,
          revenue: Number(item.totalPrice),
        });
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        revenue: this.toMoney(item.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private toMoney(value: number) {
    return Number(value.toFixed(3));
  }
}
