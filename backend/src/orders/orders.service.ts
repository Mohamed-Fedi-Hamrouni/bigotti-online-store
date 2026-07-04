import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type InternalOrderItem = {
  productId: string;
  productVariantId: string;
  productName: string;
  productReference: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  saleCampaign: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    buyQuantity: number | null;
    freeQuantity: number | null;
    startDate: Date | null;
    endDate: Date | null;
  } | null;
};

type PromotionUnit = {
  orderItemIndex: number;
  price: number;
};

type PromotionGroup = {
  campaignId: string;
  campaignName: string;
  buyQuantity: number;
  freeQuantity: number;
  units: PromotionUnit[];
};

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
        product: {
          include: {
            saleCampaign: true,
            collection: true,
          },
        },
      },
    });

    if (variants.length !== new Set(variantIds).size) {
      throw new BadRequestException(
        'Un ou plusieurs articles sont introuvables.',
      );
    }

    const orderItemsBeforePromotion: InternalOrderItem[] = dto.items.map(
      (item) => {
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
        const totalPrice = this.toMoney(unitPrice * item.quantity);

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
          saleCampaign: variant.product.saleCampaign
            ? {
                id: variant.product.saleCampaign.id,
                name: variant.product.saleCampaign.name,
                type: variant.product.saleCampaign.type,
                isActive: variant.product.saleCampaign.isActive,
                buyQuantity: variant.product.saleCampaign.buyQuantity,
                freeQuantity: variant.product.saleCampaign.freeQuantity,
                startDate: variant.product.saleCampaign.startDate,
                endDate: variant.product.saleCampaign.endDate,
              }
            : null,
        };
      },
    );

    const orderItems = this.applyBuyXGetYPromotions(orderItemsBeforePromotion);

    const subtotal = this.toMoney(
      orderItems.reduce((sum, item) => sum + Number(item.totalPrice), 0),
    );

    const deliveryFee = 8;
    const total = this.toMoney(subtotal + deliveryFee);
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          ...(connectedCustomer
            ? {
                customer: {
                  connect: {
                    id: connectedCustomer.id,
                  },
                },
              }
            : {}),
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
            create: orderItems.map((item) => ({
              product: {
                connect: {
                  id: item.productId,
                },
              },
              variant: {
                connect: {
                  id: item.productVariantId,
                },
              },
              productReference: item.productReference,
              productName: item.productName,
              color: item.color,
              size: item.size,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
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

  private applyBuyXGetYPromotions(orderItems: InternalOrderItem[]) {
    const groups = new Map<string, PromotionGroup>();

    orderItems.forEach((item, orderItemIndex) => {
      const campaign = item.saleCampaign;

      if (!this.isBuyXGetYCampaignActive(campaign)) {
        return;
      }

      const buyQuantity = Number(campaign!.buyQuantity);
      const freeQuantity = Number(campaign!.freeQuantity);

      const existingGroup = groups.get(campaign!.id);

      const group =
        existingGroup ??
        ({
          campaignId: campaign!.id,
          campaignName: campaign!.name,
          buyQuantity,
          freeQuantity,
          units: [],
        } satisfies PromotionGroup);

      for (let index = 0; index < item.quantity; index += 1) {
        group.units.push({
          orderItemIndex,
          price: item.unitPrice,
        });
      }

      groups.set(campaign!.id, group);
    });

    const discountsByOrderItemIndex = new Map<number, number>();

    for (const group of groups.values()) {
      const groupSize = group.buyQuantity + group.freeQuantity;

      if (groupSize <= 0) {
        continue;
      }

      const freeItemsCount = Math.min(
        group.units.length,
        Math.floor(group.units.length / groupSize) * group.freeQuantity,
      );

      if (freeItemsCount <= 0) {
        continue;
      }

      const freeUnits = [...group.units]
        .sort((a, b) => a.price - b.price)
        .slice(0, freeItemsCount);

      for (const unit of freeUnits) {
        discountsByOrderItemIndex.set(
          unit.orderItemIndex,
          this.toMoney(
            (discountsByOrderItemIndex.get(unit.orderItemIndex) ?? 0) +
              unit.price,
          ),
        );
      }
    }

    return orderItems.map((item, index) => {
      const discount = discountsByOrderItemIndex.get(index) ?? 0;
      const normalTotalPrice = item.unitPrice * item.quantity;

      return {
        ...item,
        totalPrice: this.toMoney(Math.max(0, normalTotalPrice - discount)),
      };
    });
  }

  private isBuyXGetYCampaignActive(
    campaign: InternalOrderItem['saleCampaign'],
  ) {
    if (!campaign) {
      return false;
    }

    if (!campaign.isActive) {
      return false;
    }

    if (campaign.type !== 'ACHETEZ_X_OBTENEZ_Y') {
      return false;
    }

    if (
      !campaign.buyQuantity ||
      campaign.buyQuantity <= 0 ||
      !campaign.freeQuantity ||
      campaign.freeQuantity <= 0
    ) {
      return false;
    }

    return this.isDateRangeActive(campaign.startDate, campaign.endDate);
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
    discountStartDate?: Date | null;
    discountEndDate?: Date | null;
    saleCampaign?: {
      isActive: boolean;
      type: string;
      discountValue: unknown | null;
      startDate: Date | null;
      endDate: Date | null;
    } | null;
    collection?: {
      promoIsActive: boolean;
      promoPercentage: unknown | null;
      promoStartDate: Date | null;
      promoEndDate: Date | null;
    } | null;
  }) {
    const price = Number(product.price);

    const productPromoPrice = this.calculateProductPromoPrice(product, price);

    if (productPromoPrice !== null) {
      return this.toMoney(productPromoPrice);
    }

    const campaignPromoPrice = this.calculateSaleCampaignPromoPrice(
      product.saleCampaign,
      price,
    );

    if (campaignPromoPrice !== null) {
      return this.toMoney(campaignPromoPrice);
    }

    const collectionPromoPrice = this.calculateCollectionPromoPrice(
      product.collection,
      price,
    );

    if (collectionPromoPrice !== null) {
      return this.toMoney(collectionPromoPrice);
    }

    return this.toMoney(price);
  }

  private calculateProductPromoPrice(product: any, price: number) {
    if (!product.isOnSale || !product.discountType || !product.discountValue) {
      return null;
    }

    if (
      !this.isDateRangeActive(
        product.discountStartDate,
        product.discountEndDate,
      )
    ) {
      return null;
    }

    const discountType = String(product.discountType ?? 'NONE');
    const discountValue = Number(product.discountValue ?? 0);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return null;
    }

    if (discountType === 'PERCENTAGE') {
      return Math.max(0, price - price * (discountValue / 100));
    }

    if (discountType === 'FIXED_AMOUNT' || discountType === 'FIXED') {
      return Math.max(0, price - discountValue);
    }

    return null;
  }

  private calculateSaleCampaignPromoPrice(
    campaign:
      | {
          isActive: boolean;
          type: string;
          discountValue: unknown | null;
          startDate: Date | null;
          endDate: Date | null;
        }
      | null
      | undefined,
    price: number,
  ) {
    if (!campaign?.isActive || !campaign.discountValue) {
      return null;
    }

    if (!this.isDateRangeActive(campaign.startDate, campaign.endDate)) {
      return null;
    }

    const discountValue = Number(campaign.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return null;
    }

    if (campaign.type === 'REMISE_POURCENTAGE') {
      return Math.max(0, price - (price * discountValue) / 100);
    }

    if (campaign.type === 'REMISE_MONTANT_FIXE') {
      return Math.max(0, price - discountValue);
    }

    return null;
  }

  private calculateCollectionPromoPrice(collection: any, price: number) {
    if (!collection?.promoIsActive || !collection.promoPercentage) {
      return null;
    }

    if (
      !this.isDateRangeActive(
        collection.promoStartDate,
        collection.promoEndDate,
      )
    ) {
      return null;
    }

    const promoPercentage = Number(collection.promoPercentage);

    if (!Number.isFinite(promoPercentage) || promoPercentage <= 0) {
      return null;
    }

    return Math.max(0, price - (price * promoPercentage) / 100);
  }

  private isDateRangeActive(startDate?: Date | null, endDate?: Date | null) {
    const now = new Date();

    if (startDate && startDate > now) {
      return false;
    }

    if (endDate && endDate < now) {
      return false;
    }

    return true;
  }

  private toMoney(value: number) {
    return Number(value.toFixed(3));
  }

  private defaultInclude() {
    return {
      items: true,
      payment: true,
    };
  }

  private normalizeOrderResponse<
    T extends {
      payment?: unknown;
      items?: Array<{
        variantId?: string | null;
        [key: string]: unknown;
      }>;
    },
  >(order: T) {
    const { payment, items, ...orderWithoutPayment } = order;

    return {
      ...orderWithoutPayment,
      items: items
        ? items.map((item) => ({
            ...item,
            productVariantId: item.variantId,
          }))
        : [],
      payments: payment ? [payment] : [],
    };
  }
}
