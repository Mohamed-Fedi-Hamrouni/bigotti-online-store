import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const reference = createProductDto.reference.trim().toUpperCase();
    const slug = this.generateSlug(
      createProductDto.slug ?? createProductDto.name,
    );

    await this.ensureReferenceIsUnique(reference);
    await this.ensureSlugIsUnique(slug);
    await this.ensureRelationsExist({
      categoryId: createProductDto.categoryId,
      collectionId: createProductDto.collectionId,
      saleCampaignId: createProductDto.saleCampaignId,
    });

    this.validateDiscount(createProductDto);

    const product = await this.prisma.product.create({
      data: {
        reference,
        name: createProductDto.name.trim(),
        slug,
        shortDescription: createProductDto.shortDescription?.trim() || null,
        description: createProductDto.description?.trim() || null,
        price: createProductDto.price,
        discountType: createProductDto.discountType ?? null,
        discountValue: createProductDto.discountValue ?? null,
        discountStartDate: createProductDto.discountStartDate
          ? new Date(createProductDto.discountStartDate)
          : null,
        discountEndDate: createProductDto.discountEndDate
          ? new Date(createProductDto.discountEndDate)
          : null,
        status: createProductDto.status ?? 'DRAFT',
        isFeatured: createProductDto.isFeatured ?? false,
        isNewArrival: createProductDto.isNewArrival ?? false,
        isOnSale: createProductDto.isOnSale ?? false,

        category: {
          connect: {
            id: createProductDto.categoryId,
          },
        },

        collection: createProductDto.collectionId
          ? {
              connect: {
                id: createProductDto.collectionId,
              },
            }
          : undefined,

        saleCampaign: createProductDto.saleCampaignId
          ? {
              connect: {
                id: createProductDto.saleCampaignId,
              },
            }
          : undefined,

        images: {
          create: (createProductDto.images ?? []).map((image, index) => ({
            url: image.url.trim(),
            storagePath: image.storagePath?.trim() || null,
            altText: image.altText?.trim() || createProductDto.name.trim(),
            isMain: image.isMain ?? index === 0,
            position: image.position ?? index,
          })),
        },

        variants: {
          create: createProductDto.variants.map((variant) => ({
            color: variant.color.trim(),
            size: variant.size.trim(),
            stockQuantity: variant.stockQuantity,
            sku: variant.sku?.trim() || null,
            isActive: true,
          })),
        },
      } as any,
      include: this.defaultInclude(),
    });

    return this.formatProduct(product);
  }

  async findPublicProducts() {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
      },
      include: this.defaultInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products.map((product) => this.formatProduct(product));
  }

  async findPublicProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      include: this.defaultInclude(),
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }

    return this.formatProduct(product);
  }

  async findAllForAdmin() {
    const products = await this.prisma.product.findMany({
      include: this.defaultInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products.map((product) => this.formatProduct(product));
  }

  async findOneForAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }

    return this.formatProduct(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOneForAdmin(id);

    const data: Record<string, unknown> = {};

    if (updateProductDto.reference !== undefined) {
      const reference = updateProductDto.reference.trim().toUpperCase();

      const existingProduct = await this.prisma.product.findUnique({
        where: { reference },
      });

      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException(
          'Un produit avec cette référence existe déjà.',
        );
      }

      data.reference = reference;
    }

    if (updateProductDto.name !== undefined) {
      data.name = updateProductDto.name.trim();
    }

    if (updateProductDto.slug !== undefined) {
      const slug = this.generateSlug(updateProductDto.slug);

      const existingProduct = await this.prisma.product.findUnique({
        where: { slug },
      });

      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException('Un produit avec ce slug existe déjà.');
      }

      data.slug = slug;
    }

    if (updateProductDto.shortDescription !== undefined) {
      data.shortDescription = updateProductDto.shortDescription?.trim() || null;
    }

    if (updateProductDto.description !== undefined) {
      data.description = updateProductDto.description?.trim() || null;
    }

    if (updateProductDto.price !== undefined) {
      data.price = updateProductDto.price;
    }

    if (updateProductDto.discountType !== undefined) {
      data.discountType = updateProductDto.discountType ?? null;
    }

    if (updateProductDto.discountValue !== undefined) {
      data.discountValue = updateProductDto.discountValue ?? null;
    }

    if (updateProductDto.discountStartDate !== undefined) {
      data.discountStartDate = updateProductDto.discountStartDate
        ? new Date(updateProductDto.discountStartDate)
        : null;
    }

    if (updateProductDto.discountEndDate !== undefined) {
      data.discountEndDate = updateProductDto.discountEndDate
        ? new Date(updateProductDto.discountEndDate)
        : null;
    }

    if (updateProductDto.status !== undefined) {
      data.status = updateProductDto.status;
    }

    if (updateProductDto.isFeatured !== undefined) {
      data.isFeatured = updateProductDto.isFeatured;
    }

    if (updateProductDto.isNewArrival !== undefined) {
      data.isNewArrival = updateProductDto.isNewArrival;
    }

    if (updateProductDto.isOnSale !== undefined) {
      data.isOnSale = updateProductDto.isOnSale;
    }

    if (
      updateProductDto.categoryId ||
      updateProductDto.collectionId ||
      updateProductDto.saleCampaignId
    ) {
      await this.ensureRelationsExist({
        categoryId: updateProductDto.categoryId,
        collectionId: updateProductDto.collectionId,
        saleCampaignId: updateProductDto.saleCampaignId,
      });
    }

    if (updateProductDto.categoryId !== undefined) {
      data.category = {
        connect: {
          id: updateProductDto.categoryId,
        },
      };
    }

    if (updateProductDto.collectionId !== undefined) {
      data.collection = updateProductDto.collectionId
        ? {
            connect: {
              id: updateProductDto.collectionId,
            },
          }
        : {
            disconnect: true,
          };
    }

    if (updateProductDto.saleCampaignId !== undefined) {
      data.saleCampaign = updateProductDto.saleCampaignId
        ? {
            connect: {
              id: updateProductDto.saleCampaignId,
            },
          }
        : {
            disconnect: true,
          };
    }

    if (updateProductDto.images !== undefined) {
      data.images = {
        deleteMany: {},
        create: updateProductDto.images.map((image, index) => ({
          url: image.url.trim(),
          storagePath: image.storagePath?.trim() || null,
          altText:
            image.altText?.trim() || updateProductDto.name?.trim() || null,
          isMain: image.isMain ?? index === 0,
          position: image.position ?? index,
        })),
      };
    }

    if (updateProductDto.variants !== undefined) {
      data.variants = {
        deleteMany: {},
        create: updateProductDto.variants.map((variant) => ({
          color: variant.color.trim(),
          size: variant.size.trim(),
          stockQuantity: variant.stockQuantity,
          sku: variant.sku?.trim() || null,
          isActive: true,
        })),
      };
    }

    this.validateDiscount({
      discountType: updateProductDto.discountType,
      discountValue: updateProductDto.discountValue,
      isOnSale: updateProductDto.isOnSale,
    });

    const product = await this.prisma.product.update({
      where: { id },
      data: data as any,
      include: this.defaultInclude(),
    });

    return this.formatProduct(product);
  }

  async updateStatus(
    id: string,
    updateProductStatusDto: UpdateProductStatusDto,
  ) {
    await this.findOneForAdmin(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        status: updateProductStatusDto.status,
      },
      include: this.defaultInclude(),
    });

    return this.formatProduct(product);
  }

  private async ensureReferenceIsUnique(reference: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { reference },
    });

    if (existingProduct) {
      throw new ConflictException(
        'Un produit avec cette référence existe déjà.',
      );
    }
  }

  private async ensureSlugIsUnique(slug: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      throw new ConflictException('Un produit avec ce slug existe déjà.');
    }
  }

  private async ensureRelationsExist(params: {
    categoryId?: string;
    collectionId?: string;
    saleCampaignId?: string;
  }) {
    if (params.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: params.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Catégorie introuvable.');
      }
    }

    if (params.collectionId) {
      const collection = await this.prisma.collection.findUnique({
        where: { id: params.collectionId },
      });

      if (!collection) {
        throw new BadRequestException('Collection introuvable.');
      }
    }

    if (params.saleCampaignId) {
      const campaign = await this.prisma.saleCampaign.findUnique({
        where: { id: params.saleCampaignId },
      });

      if (!campaign) {
        throw new BadRequestException('Campagne de solde introuvable.');
      }
    }
  }

  private validateDiscount(product: {
    discountType?: string | null;
    discountValue?: number | null;
    isOnSale?: boolean | null;
  }) {
    if (product.isOnSale && !product.discountType) {
      throw new BadRequestException(
        'Le type de remise est obligatoire pour un produit en solde.',
      );
    }

    if (
      product.isOnSale &&
      (product.discountValue === undefined || product.discountValue === null)
    ) {
      throw new BadRequestException(
        'La valeur de remise est obligatoire pour un produit en solde.',
      );
    }

    if (
      product.discountType === 'PERCENTAGE' &&
      product.discountValue !== undefined &&
      product.discountValue !== null &&
      product.discountValue > 100
    ) {
      throw new BadRequestException(
        'La remise en pourcentage ne peut pas dépasser 100%.',
      );
    }
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

  private calculateDiscountPercentage(product: {
    price: unknown;
    isOnSale: boolean;
    discountType: string | null;
    discountValue: unknown | null;
  }) {
    const price = Number(product.price);

    if (!product.isOnSale || !product.discountType || !product.discountValue) {
      return 0;
    }

    const discountValue = Number(product.discountValue);

    if (product.discountType === 'PERCENTAGE') {
      return Math.round(discountValue);
    }

    if (product.discountType === 'FIXED_AMOUNT' && price > 0) {
      return Math.round((discountValue / price) * 100);
    }

    return 0;
  }

  private formatProduct(product: any) {
    const finalPrice = this.calculateFinalPrice(product);
    const discountPercentage = this.calculateDiscountPercentage(product);

    return {
      ...product,
      price: Number(product.price),
      discountValue:
        product.discountValue !== null ? Number(product.discountValue) : null,
      finalPrice,
      discountPercentage,
      totalStock: product.variants?.reduce(
        (sum: number, variant: { stockQuantity: number }) =>
          sum + variant.stockQuantity,
        0,
      ),
    };
  }

  private toMoney(value: number) {
    return Number(value.toFixed(3));
  }

  private defaultInclude(): Prisma.ProductInclude {
    return {
      category: true,
      collection: true,
      saleCampaign: true,
      images: {
        orderBy: [
          {
            position: 'asc',
          },
        ],
      },
      variants: {
        orderBy: [
          {
            color: 'asc',
          },
          {
            size: 'asc',
          },
        ],
      },
    };
  }

  private generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
