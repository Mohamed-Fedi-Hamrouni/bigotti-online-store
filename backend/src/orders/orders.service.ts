import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async create(dto: CreateOrderDto, authorization?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'La commande doit contenir au moins un article.',
      );
    }

    const connectedCustomer =
      await this.getCustomerFromAuthorizationHeader(authorization);

    const variantIds = dto.items.map((item) => item.variantId);

    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      include: {
        product: true,
      },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException(
        'Un ou plusieurs articles sont introuvables.',
      );
    }

    const orderItems = dto.items.map((item) => {
      const variant = variants.find(
        (currentVariant) => currentVariant.id === item.variantId,
      );

      if (!variant) {
        throw new BadRequestException('Variante produit introuvable.');
      }

      if (item.quantity <= 0) {
        throw new BadRequestException(
          'La quantité doit être supérieure à zéro.',
        );
      }

      if (variant.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour ${variant.product.name} - ${variant.color} / ${variant.size}.`,
        );
      }

      if (variant.product.status !== 'PUBLISHED') {
        throw new BadRequestException(
          `Le produit ${variant.product.name} n'est pas disponible.`,
        );
      }

      const unitPrice = this.calculateProductFinalPrice(variant.product);
      const totalPrice = unitPrice * item.quantity;

      return {
        productId: variant.productId,
        productVariantId: variant.id,
        productName: variant.product.name,
        productReference: variant.product.reference,
        color: variant.color,
        size: variant.size,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0,
    );

    const deliveryFee = 7;
    const total = subtotal + deliveryFee;
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: connectedCustomer?.id,
          customerName: connectedCustomer?.fullName ?? dto.customerName,
          customerPhone: connectedCustomer?.phone ?? dto.customerPhone,
          customerEmail: connectedCustomer?.email ?? dto.customerEmail,
          deliveryAddress: dto.deliveryAddress,
          deliveryCity: dto.deliveryCity,
          deliveryNotes: dto.deliveryNotes,
          subtotal,
          deliveryFee,
          total,
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'UNPAID',
          orderStatus: 'PENDING',
          items: {
            create: orderItems,
          },
          payment: {
            create: {
              amount: total,
              method: dto.paymentMethod,
              status: 'UNPAID',
            },
          },
        },
        include: this.defaultInclude(),
      });

      for (const item of dto.items) {
        await tx.productVariant.update({
          where: {
            id: item.variantId,
          },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      return createdOrder;
    });

    return this.normalizeOrderResponse(order);
  }

  async findAllAdmin() {
    const orders = await this.prisma.order.findMany({
      include: this.defaultInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => this.normalizeOrderResponse(order));
  }

  async findOneAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        id,
      },
      include: this.defaultInclude(),
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }

    return this.normalizeOrderResponse(order);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: {
        id,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }

    const updatedOrder = await this.prisma.order.update({
      where: {
        id,
      },
      data: {
        orderStatus: dto.orderStatus,
      },
      include: this.defaultInclude(),
    });

    return this.normalizeOrderResponse(updatedOrder);
  }

  async trackOrder(orderNumber: string, customerPhone: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber,
        customerPhone,
      },
      include: this.defaultInclude(),
    });

    if (!order) {
      throw new NotFoundException(
        'Commande introuvable. Vérifiez le numéro de commande et le téléphone.',
      );
    }

    return this.normalizeOrderResponse(order);
  }

  private async generateOrderNumber() {
    const ordersCount = await this.prisma.order.count();
    const nextNumber = ordersCount + 1;

    return `BG-${String(nextNumber).padStart(4, '0')}`;
  }

  private async getCustomerFromAuthorizationHeader(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    const token = authorization.replace('Bearer ', '').trim();

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        type?: string;
      }>(token);

      if (payload.type !== 'CUSTOMER') {
        return null;
      }

      return this.prisma.customer.findUnique({
        where: {
          id: payload.sub,
        },
      });
    } catch {
      return null;
    }
  }

  private calculateProductFinalPrice(product: {
    price: unknown;
    isOnSale?: boolean | null;
    discountType?: unknown;
    discountValue?: unknown;
  }) {
    const price = Number(product.price);
    const discountType = String(product.discountType ?? 'NONE');
    const discountValue = Number(product.discountValue ?? 0);

    if (!product.isOnSale || discountValue <= 0) {
      return price;
    }

    if (discountType === 'PERCENTAGE') {
      return Math.max(0, price - price * (discountValue / 100));
    }

    if (discountType === 'FIXED_AMOUNT' || discountType === 'FIXED') {
      return Math.max(0, price - discountValue);
    }

    return price;
  }

  private defaultInclude() {
    return {
      items: true,
      payment: true,
    };
  }

  private normalizeOrderResponse<T extends { payment?: unknown }>(order: T) {
    const { payment, ...orderWithoutPayment } = order;

    return {
      ...orderWithoutPayment,
      payments: payment ? [payment] : [],
    };
  }
}
