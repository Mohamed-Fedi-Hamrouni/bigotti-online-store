import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorageService } from '../uploads/media-storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const reference = createProductDto.reference.trim().toUpperCase();
    const slug = this.generateSlug(
      createProductDto.slug ?? createProductDto.name,
    );

    await this.ensureReferenceIsUnique(reference);
    await this.ensureSlugIsUnique(slug);
    await this.ensureRelationsExist({
      categoryId: createProductDto.categoryId,
      categoryTypeId: createProductDto.categoryTypeId,
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

        category: { connect: { id: createProductDto.categoryId } },

        categoryType: createProductDto.categoryTypeId
          ? { connect: { id: createProductDto.categoryTypeId } }
          : undefined,

        collection: createProductDto.collectionId
          ? { connect: { id: createProductDto.collectionId } }
          : undefined,

        saleCampaign: createProductDto.saleCampaignId
          ? { connect: { id: createProductDto.saleCampaignId } }
          : undefined,

        images: {
          create: (createProductDto.images ?? []).map((image, index) => ({
            url: image.url.trim(),
            storagePath: image.storagePath?.trim() || null,
            altText: image.altText?.trim() || createProductDto.name.trim(),
            color: image.color?.trim() || null,
            colorHex: this.normalizeHex(image.colorHex),
            isMain: image.isMain ?? index === 0,
            position: image.position ?? index,
          })),
        },

        variants: {
          create: createProductDto.variants.map((variant) => ({
            color: variant.color.trim(),
            colorHex: this.normalizeHex(variant.colorHex),
            size: variant.size.trim(),
            stockQuantity: variant.stockQuantity,
            sku: variant.sku?.trim() || null,
            isActive: variant.isActive ?? true,
          })),
        },
      } as any,
      include: this.defaultInclude(),
    });

    return this.formatProduct(product);
  }

  async findPublicProducts() {
    const products = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => this.formatProduct(product));
  }

  async findPublicProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'PUBLISHED' },
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
      orderBy: { createdAt: 'desc' },
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
    const currentProduct = await this.prisma.product.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!currentProduct) {
      throw new NotFoundException('Produit introuvable.');
    }

    const previousImageStoragePaths = currentProduct.images.map(
      (image) => image.storagePath,
    );

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

    const effectiveCategoryId =
      updateProductDto.categoryId ?? currentProduct.categoryId;

    const effectiveCategoryTypeId =
      updateProductDto.categoryTypeId !== undefined
        ? updateProductDto.categoryTypeId
        : currentProduct.categoryTypeId;

    if (
      updateProductDto.categoryId !== undefined ||
      updateProductDto.categoryTypeId !== undefined ||
      updateProductDto.collectionId !== undefined ||
      updateProductDto.saleCampaignId !== undefined
    ) {
      await this.ensureRelationsExist({
        categoryId: effectiveCategoryId,
        categoryTypeId: effectiveCategoryTypeId,
        collectionId: updateProductDto.collectionId,
        saleCampaignId: updateProductDto.saleCampaignId,
      });
    }

    if (updateProductDto.categoryId !== undefined) {
      data.category = { connect: { id: updateProductDto.categoryId } };
    }

    if (updateProductDto.categoryTypeId !== undefined) {
      data.categoryType = updateProductDto.categoryTypeId
        ? { connect: { id: updateProductDto.categoryTypeId } }
        : { disconnect: true };
    }

    if (updateProductDto.collectionId !== undefined) {
      data.collection = updateProductDto.collectionId
        ? { connect: { id: updateProductDto.collectionId } }
        : { disconnect: true };
    }

    if (updateProductDto.saleCampaignId !== undefined) {
      data.saleCampaign = updateProductDto.saleCampaignId
        ? { connect: { id: updateProductDto.saleCampaignId } }
        : { disconnect: true };
    }

    if (updateProductDto.images !== undefined) {
      data.images = {
        deleteMany: {},
        create: updateProductDto.images.map((image, index) => ({
          url: image.url.trim(),
          storagePath: image.storagePath?.trim() || null,
          altText:
            image.altText?.trim() || updateProductDto.name?.trim() || null,
          color: image.color?.trim() || null,
          colorHex: this.normalizeHex(image.colorHex),
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
          colorHex: this.normalizeHex(variant.colorHex),
          size: variant.size.trim(),
          stockQuantity: variant.stockQuantity,
          sku: variant.sku?.trim() || null,
          isActive: variant.isActive ?? true,
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

    if (updateProductDto.images !== undefined) {
      const retainedStoragePaths = new Set(
        updateProductDto.images
          .map((image) => image.storagePath?.trim())
          .filter((storagePath): storagePath is string =>
            Boolean(storagePath),
          ),
      );

      await this.mediaStorageService.deleteMany(
        previousImageStoragePaths.filter(
          (storagePath) =>
            storagePath && !retainedStoragePaths.has(storagePath),
        ),
      );
    }

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
    categoryTypeId?: string | null;
    collectionId?: string | null;
    saleCampaignId?: string | null;
  }) {
    if (params.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: params.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Catégorie introuvable.');
      }
    }

    if (params.categoryTypeId) {
      const categoryType = await this.prisma.categoryType.findUnique({
        where: { id: params.categoryTypeId },
      });

      if (!categoryType) {
        throw new BadRequestException('Type de catégorie introuvable.');
      }

      if (params.categoryId && categoryType.categoryId !== params.categoryId) {
        throw new BadRequestException(
          'Le type sélectionné ne correspond pas à la catégorie choisie.',
        );
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
        throw new BadRequestException('Campagne introuvable.');
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

    if (
      product.discountType === 'PERCENTAGE' &&
      product.discountValue !== undefined &&
      product.discountValue !== null &&
      product.discountValue < 0
    ) {
      throw new BadRequestException(
        'La remise en pourcentage doit être positive.',
      );
    }

    if (
      product.discountType === 'FIXED_AMOUNT' &&
      product.discountValue !== undefined &&
      product.discountValue !== null &&
      product.discountValue < 0
    ) {
      throw new BadRequestException('La remise fixe doit être positive.');
    }
  }

  private calculateFinalPrice(product: {
    price: unknown;
    isOnSale: boolean;
    discountType: string | null;
    discountValue: unknown | null;
    discountStartDate: Date | null;
    discountEndDate: Date | null;
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

  private calculateDiscountPercentage(product: {
    price: unknown;
    isOnSale: boolean;
    discountType: string | null;
    discountValue: unknown | null;
    discountStartDate: Date | null;
    discountEndDate: Date | null;
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

    const productPromoPercentage = this.calculateProductPromoPercentage(
      product,
      price,
    );

    if (productPromoPercentage > 0) {
      return productPromoPercentage;
    }

    const campaignPromoPercentage = this.calculateSaleCampaignPromoPercentage(
      product.saleCampaign,
      price,
    );

    if (campaignPromoPercentage > 0) {
      return campaignPromoPercentage;
    }

    const collectionPromoPercentage = this.calculateCollectionPromoPercentage(
      product.collection,
    );

    if (collectionPromoPercentage > 0) {
      return collectionPromoPercentage;
    }

    return 0;
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

    const discountValue = Number(product.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return null;
    }

    if (product.discountType === 'PERCENTAGE') {
      return Math.max(0, price - (price * discountValue) / 100);
    }

    if (product.discountType === 'FIXED_AMOUNT') {
      return Math.max(0, price - discountValue);
    }

    return null;
  }

  private calculateProductPromoPercentage(product: any, price: number) {
    if (!product.isOnSale || !product.discountType || !product.discountValue) {
      return 0;
    }

    if (
      !this.isDateRangeActive(
        product.discountStartDate,
        product.discountEndDate,
      )
    ) {
      return 0;
    }

    const discountValue = Number(product.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return 0;
    }

    if (product.discountType === 'PERCENTAGE') {
      return Math.round(discountValue);
    }

    if (product.discountType === 'FIXED_AMOUNT' && price > 0) {
      return Math.round((discountValue / price) * 100);
    }

    return 0;
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

  private calculateSaleCampaignPromoPercentage(
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
      return 0;
    }

    if (!this.isDateRangeActive(campaign.startDate, campaign.endDate)) {
      return 0;
    }

    const discountValue = Number(campaign.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return 0;
    }

    if (campaign.type === 'REMISE_POURCENTAGE') {
      return Math.round(discountValue);
    }

    if (campaign.type === 'REMISE_MONTANT_FIXE' && price > 0) {
      return Math.round((discountValue / price) * 100);
    }

    return 0;
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

  private calculateCollectionPromoPercentage(collection: any) {
    if (!collection?.promoIsActive || !collection.promoPercentage) {
      return 0;
    }

    if (
      !this.isDateRangeActive(
        collection.promoStartDate,
        collection.promoEndDate,
      )
    ) {
      return 0;
    }

    const promoPercentage = Number(collection.promoPercentage);

    if (!Number.isFinite(promoPercentage) || promoPercentage <= 0) {
      return 0;
    }

    return Math.round(promoPercentage);
  }

  private isDateRangeActive(startDate: Date | null, endDate: Date | null) {
    const now = new Date();

    if (startDate && startDate > now) {
      return false;
    }

    if (endDate && endDate < now) {
      return false;
    }

    return true;
  }

  private formatProduct(product: any) {
    const finalPrice = this.calculateFinalPrice(product);
    const discountPercentage = this.calculateDiscountPercentage(product);

    return {
      ...product,
      price: Number(product.price),
      discountValue:
        product.discountValue !== null ? Number(product.discountValue) : null,
      collection: product.collection
        ? {
            ...product.collection,
            promoPercentage:
              product.collection.promoPercentage !== null
                ? Number(product.collection.promoPercentage)
                : null,
          }
        : null,
      saleCampaign: product.saleCampaign
        ? {
            ...product.saleCampaign,
            discountValue:
              product.saleCampaign.discountValue !== null
                ? Number(product.saleCampaign.discountValue)
                : null,
          }
        : null,
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

  private normalizeHex(value?: string | null) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      return null;
    }

    return trimmedValue.toUpperCase();
  }

  private defaultInclude(): Prisma.ProductInclude {
    return {
      category: true,
      categoryType: true,
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
