import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';

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

    return customers.map((customer) => this.normalizeCustomer(customer));
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

    return this.normalizeCustomer(customer);
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

    const updatedCustomer = await this.prisma.customer.update({
      where: {
        id,
      },
      data: {
        isActive: dto.isActive,
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

    return this.normalizeCustomer(updatedCustomer);
  }

  private normalizeCustomer<
    T extends {
      passwordHash?: string | null;
      orders?: Array<{
        total: unknown;
        orderStatus: string;
        createdAt: Date;
        payment?: unknown;
      }>;
    },
  >(customer: T) {
    const { passwordHash, orders = [], ...safeCustomer } = customer;

    const activeOrders = orders.filter(
      (order) => order.orderStatus !== 'CANCELLED',
    );

    const totalSpent = activeOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    const normalizedOrders = orders.map(({ payment, ...order }) => ({
      ...order,
      payments: payment ? [payment] : [],
    }));

    return {
      ...safeCustomer,
      orders: normalizedOrders,
      ordersCount: orders.length,
      totalSpent,
      lastOrderAt: orders[0]?.createdAt ?? null,
    };
  }
}
