import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type OrderItemData = {
  productId: string;
  variantId: string;
  productReference: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.generateOrderNumber(tx);

      const orderItemsData: OrderItemData[] = [];

      for (const item of createOrderDto.items) {
        const variant = await tx.productVariant.findUnique({
          where: {
            id: item.variantId,
          },
          include: {
            product: true,
          },
        });

        if (!variant || !variant.isActive) {
          throw new BadRequestException('Variante produit introuvable.');
        }

        if (variant.product.status !== 'PUBLISHED') {
          throw new BadRequestException(
            `Le produit ${variant.product.reference} n'est pas publié.`,
          );
        }

        if (variant.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour ${variant.product.name} - ${variant.color}/${variant.size}.`,
          );
        }

        const unitPrice = this.calculateFinalPrice(variant.product);
        const totalPrice = this.toMoney(unitPrice * item.quantity);

        orderItemsData.push({
          productId: variant.product.id,
          variantId: variant.id,
          productReference: variant.product.reference,
          productName: variant.product.name,
          color: variant.color,
          size: variant.size,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });

        await tx.productVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      const subtotal = this.toMoney(
        orderItemsData.reduce((sum, item) => sum + Number(item.totalPrice), 0),
      );

      const deliveryFee = this.getDeliveryFee(subtotal);
      const total = this.toMoney(subtotal + deliveryFee);

      const paymentStatus =
        createOrderDto.paymentMethod === 'CARD' ? 'PAID' : 'UNPAID';

      const customer = await tx.customer.create({
        data: {
          fullName: createOrderDto.customerName.trim(),
          phone: createOrderDto.customerPhone.trim(),
          email: createOrderDto.customerEmail?.toLowerCase().trim() || null,
        },
      });

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: createOrderDto.customerName.trim(),
          customerPhone: createOrderDto.customerPhone.trim(),
          customerEmail:
            createOrderDto.customerEmail?.toLowerCase().trim() || null,
          deliveryAddress: createOrderDto.deliveryAddress.trim(),
          deliveryCity: createOrderDto.deliveryCity.trim(),
          deliveryNotes: createOrderDto.deliveryNotes?.trim() || null,
          subtotal,
          deliveryFee,
          total,
          paymentMethod: createOrderDto.paymentMethod,
          paymentStatus,
          orderStatus: 'PENDING',
          items: {
            create: orderItemsData,
          },
          payment: {
            create: {
              method: createOrderDto.paymentMethod,
              status: paymentStatus,
              amount: total,
              transactionReference:
                createOrderDto.paymentMethod === 'CARD'
                  ? `SIM-${orderNumber}`
                  : null,
              paidAt: paymentStatus === 'PAID' ? new Date() : null,
            },
          },
        },
        include: this.defaultInclude(),
      });

      return this.formatOrder(order);
    });
  }

  async findAllForAdmin() {
    const orders = await this.prisma.order.findMany({
      include: this.defaultInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => this.formatOrder(order));
  }

  async findOneForAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }

    return this.formatOrder(order);
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Commande introuvable.');
    }

    const data: Record<string, unknown> = {
      orderStatus: updateOrderStatusDto.orderStatus,
    };

    if (updateOrderStatusDto.orderStatus === 'DELIVERED') {
      data.paymentStatus = 'PAID';

      if (existingOrder.payment) {
        data.payment = {
          update: {
            status: 'PAID',
            paidAt: existingOrder.payment.paidAt ?? new Date(),
          },
        };
      }
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: data as any,
      include: this.defaultInclude(),
    });

    return this.formatOrder(order);
  }

  private async generateOrderNumber(tx: Prisma.TransactionClient) {
    const count = await tx.order.count();
    const nextNumber = count + 1;

    return `BG-${String(nextNumber).padStart(4, '0')}`;
  }

  private calculateFinalPrice(product: {
    price: unknown;
    isOnSale: boolean;
    discountType: string | null;
    discountValue: unknown | null;
    discountStartDate: Date | null;
    discountEndDate: Date | null;
  }) {
    const price = Number(product.price);

    if (!product.isOnSale || !product.discountType || !product.discountValue) {
      return this.toMoney(price);
    }

    const now = new Date();

    if (product.discountStartDate && product.discountStartDate > now) {
      return this.toMoney(price);
    }

    if (product.discountEndDate && product.discountEndDate < now) {
      return this.toMoney(price);
    }

    const discountValue = Number(product.discountValue);

    if (product.discountType === 'PERCENTAGE') {
      return this.toMoney(Math.max(0, price - (price * discountValue) / 100));
    }

    if (product.discountType === 'FIXED_AMOUNT') {
      return this.toMoney(Math.max(0, price - discountValue));
    }

    return this.toMoney(price);
  }

  private getDeliveryFee(subtotal: number) {
    return subtotal >= 200 ? 0 : 8;
  }

  private toMoney(value: number) {
    return Number(value.toFixed(3));
  }

  private defaultInclude(): Prisma.OrderInclude {
    return {
      customer: true,
      items: {
        orderBy: [
          {
            id: 'asc',
          },
        ],
      },
      payment: true,
    };
  }

  private formatOrder(order: any) {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      payment: order.payment
        ? {
            ...order.payment,
            amount: Number(order.payment.amount),
          }
        : null,
    };
  }
}
