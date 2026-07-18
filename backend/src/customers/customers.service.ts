import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';

type CustomerWithOrders = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string | null;
  orders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryNotes: string | null;
    subtotal: unknown;
    deliveryFee: unknown;
    total: unknown;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    createdAt: Date;
    updatedAt: Date;
    items: unknown[];
    payment?: unknown;
  }>;
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdmin() {
    const customers = await this.prisma.customer.findMany({
      include: {
        orders: {
          include: {
            items: true,
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.groupCustomers(customers as CustomerWithOrders[]);
  }

  async findOneAdmin(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: {
        id,
      },
      include: {
        orders: {
          include: {
            items: true,
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Client introuvable.');
    }

    const duplicateWhere = this.buildDuplicateWhere(
      customer as unknown as CustomerWithOrders,
    );

    const customers = await this.prisma.customer.findMany({
      where: duplicateWhere,
      include: {
        orders: {
          include: {
            items: true,
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.normalizeCustomerGroup(
      customers as CustomerWithOrders[],
      customer.id,
    );
  }

  async updateStatus(id: string, dto: UpdateCustomerStatusDto) {
    const customer = await this.prisma.customer.findUnique({
      where: {
        id,
      },
    });

    if (!customer) {
      throw new NotFoundException('Client introuvable.');
    }

    const duplicateWhere = this.buildDuplicateWhere(
      customer as unknown as CustomerWithOrders,
    );

    await this.prisma.customer.updateMany({
      where: duplicateWhere,
      data: {
        isActive: dto.isActive,
      },
    });

    const updatedCustomers = await this.prisma.customer.findMany({
      where: duplicateWhere,
      include: {
        orders: {
          include: {
            items: true,
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.normalizeCustomerGroup(
      updatedCustomers as CustomerWithOrders[],
      customer.id,
    );
  }

  private groupCustomers(customers: CustomerWithOrders[]) {
    const groups = new Map<string, CustomerWithOrders[]>();

    for (const customer of customers) {
      const groupKey = this.getCustomerGroupKey(customer);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }

      groups.get(groupKey)?.push(customer);
    }

    return Array.from(groups.values())
      .map((group) => this.normalizeCustomerGroup(group))
      .sort((firstCustomer, secondCustomer) => {
        const firstDate = firstCustomer.lastOrderAt
          ? new Date(firstCustomer.lastOrderAt).getTime()
          : new Date(firstCustomer.createdAt).getTime();

        const secondDate = secondCustomer.lastOrderAt
          ? new Date(secondCustomer.lastOrderAt).getTime()
          : new Date(secondCustomer.createdAt).getTime();

        return secondDate - firstDate;
      });
  }

  private getCustomerGroupKey(customer: CustomerWithOrders) {
    if (customer.email) {
      return `email:${customer.email.trim().toLowerCase()}`;
    }

    if (customer.phone) {
      return `phone:${customer.phone.trim().replace(/\s+/g, '')}`;
    }

    return `id:${customer.id}`;
  }

  private buildDuplicateWhere(customer: CustomerWithOrders) {
    if (customer.email) {
      return {
        email: customer.email,
      };
    }

    if (customer.phone) {
      return {
        phone: customer.phone,
      };
    }

    return {
      id: customer.id,
    };
  }

  private normalizeCustomerGroup(
    customers: CustomerWithOrders[],
    preferredCustomerId?: string,
  ) {
    const orderedCustomers = [...customers].sort(
      (firstCustomer, secondCustomer) =>
        new Date(secondCustomer.createdAt).getTime() -
        new Date(firstCustomer.createdAt).getTime(),
    );

    const preferredCustomer = preferredCustomerId
      ? orderedCustomers.find((customer) => customer.id === preferredCustomerId)
      : null;

    const primaryCustomer = preferredCustomer ?? orderedCustomers[0];

    const allOrders = orderedCustomers
      .flatMap((customer) => customer.orders ?? [])
      .sort(
        (firstOrder, secondOrder) =>
          new Date(secondOrder.createdAt).getTime() -
          new Date(firstOrder.createdAt).getTime(),
      );

    const activeOrders = allOrders.filter(
      (order) => order.orderStatus !== 'CANCELLED',
    );

    const totalSpent = activeOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    const normalizedOrders = allOrders.map(({ payment, ...order }) => ({
      ...order,
      payments: payment ? [payment] : [],
    }));

    const { passwordHash, orders, ...safeCustomer } = primaryCustomer;

    return {
      ...safeCustomer,
      isActive: orderedCustomers.some((customer) => customer.isActive),
      orders: normalizedOrders,
      ordersCount: allOrders.length,
      totalSpent,
      lastOrderAt: normalizedOrders[0]?.createdAt ?? null,
    };
  }
}
