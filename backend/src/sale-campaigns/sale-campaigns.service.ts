import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorageService } from '../uploads/media-storage.service';
import { CreateSaleCampaignDto } from './dto/create-sale-campaign.dto';
import { UpdateSaleCampaignStatusDto } from './dto/update-sale-campaign-status.dto';
import { UpdateSaleCampaignDto } from './dto/update-sale-campaign.dto';

type CampaignType =
  | 'REMISE_POURCENTAGE'
  | 'REMISE_MONTANT_FIXE'
  | 'ACHETEZ_X_OBTENEZ_Y'
  | 'EVENEMENT_SIMPLE';

@Injectable()
export class SaleCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  async create(createSaleCampaignDto: CreateSaleCampaignDto) {
    const slug = this.generateSlug(
      createSaleCampaignDto.slug ?? createSaleCampaignDto.name,
    );

    const existingCampaign = await this.prisma.saleCampaign.findUnique({
      where: { slug },
    });

    if (existingCampaign) {
      throw new ConflictException('Une campagne avec ce slug existe déjà.');
    }

    const type = createSaleCampaignDto.type ?? 'EVENEMENT_SIMPLE';

    this.validateDates({
      startDate: createSaleCampaignDto.startDate,
      endDate: createSaleCampaignDto.endDate,
    });

    this.validateCampaignRule({
      type,
      discountValue: createSaleCampaignDto.discountValue ?? null,
      buyQuantity: createSaleCampaignDto.buyQuantity ?? null,
      freeQuantity: createSaleCampaignDto.freeQuantity ?? null,
    });

    return this.prisma.saleCampaign.create({
      data: {
        name: createSaleCampaignDto.name.trim(),
        slug,
        description: createSaleCampaignDto.description?.trim() || null,
        isActive: createSaleCampaignDto.isActive ?? true,
        startDate: createSaleCampaignDto.startDate
          ? new Date(createSaleCampaignDto.startDate)
          : null,
        endDate: createSaleCampaignDto.endDate
          ? new Date(createSaleCampaignDto.endDate)
          : null,

        type,
        discountValue:
          type === 'REMISE_POURCENTAGE' || type === 'REMISE_MONTANT_FIXE'
            ? (createSaleCampaignDto.discountValue ?? null)
            : null,
        buyQuantity:
          type === 'ACHETEZ_X_OBTENEZ_Y'
            ? (createSaleCampaignDto.buyQuantity ?? null)
            : null,
        freeQuantity:
          type === 'ACHETEZ_X_OBTENEZ_Y'
            ? (createSaleCampaignDto.freeQuantity ?? null)
            : null,

        displayOnHome: createSaleCampaignDto.displayOnHome ?? false,
        heroTitle: createSaleCampaignDto.heroTitle?.trim() || null,
        heroSubtitle: createSaleCampaignDto.heroSubtitle?.trim() || null,

        mediaType: createSaleCampaignDto.mediaType ?? null,
        mediaUrl: createSaleCampaignDto.mediaUrl?.trim() || null,
        mediaPath: createSaleCampaignDto.mediaPath?.trim() || null,

        position: createSaleCampaignDto.position ?? 0,
      } as any,
    });
  }

  async findPublicCampaigns() {
    return this.prisma.saleCampaign.findMany({
      where: this.activeCampaignWhere(),
      orderBy: [
        {
          position: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findHomepageCampaigns() {
    return this.prisma.saleCampaign.findMany({
      where: {
        ...this.activeCampaignWhere(),
        displayOnHome: true,
      },
      include: {
        products: {
          where: {
            status: 'PUBLISHED',
          },
          include: {
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
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 12,
        },
      },
      orderBy: [
        {
          position: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findAllForAdmin() {
    return this.prisma.saleCampaign.findMany({
      orderBy: [
        {
          position: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.saleCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException('Campagne introuvable.');
    }

    return campaign;
  }

  async update(id: string, updateSaleCampaignDto: UpdateSaleCampaignDto) {
    const currentCampaign = await this.findOne(id);

    const effectiveType = (updateSaleCampaignDto.type ??
      currentCampaign.type) as CampaignType;

    const effectiveDiscountValue =
      updateSaleCampaignDto.discountValue !== undefined
        ? updateSaleCampaignDto.discountValue
        : currentCampaign.discountValue !== null
          ? Number(currentCampaign.discountValue)
          : null;

    const effectiveBuyQuantity =
      updateSaleCampaignDto.buyQuantity !== undefined
        ? updateSaleCampaignDto.buyQuantity
        : currentCampaign.buyQuantity;

    const effectiveFreeQuantity =
      updateSaleCampaignDto.freeQuantity !== undefined
        ? updateSaleCampaignDto.freeQuantity
        : currentCampaign.freeQuantity;

    const effectiveStartDate =
      updateSaleCampaignDto.startDate !== undefined
        ? updateSaleCampaignDto.startDate
        : (currentCampaign.startDate?.toISOString() ?? null);

    const effectiveEndDate =
      updateSaleCampaignDto.endDate !== undefined
        ? updateSaleCampaignDto.endDate
        : (currentCampaign.endDate?.toISOString() ?? null);

    this.validateDates({
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    });

    this.validateCampaignRule({
      type: effectiveType,
      discountValue: effectiveDiscountValue,
      buyQuantity: effectiveBuyQuantity,
      freeQuantity: effectiveFreeQuantity,
    });

    const data: Record<string, unknown> = {};

    if (updateSaleCampaignDto.name !== undefined) {
      data.name = updateSaleCampaignDto.name.trim();
    }

    if (updateSaleCampaignDto.slug !== undefined) {
      const slug = this.generateSlug(updateSaleCampaignDto.slug);

      const existingCampaign = await this.prisma.saleCampaign.findUnique({
        where: { slug },
      });

      if (existingCampaign && existingCampaign.id !== id) {
        throw new ConflictException('Une campagne avec ce slug existe déjà.');
      }

      data.slug = slug;
    }

    if (updateSaleCampaignDto.description !== undefined) {
      data.description = updateSaleCampaignDto.description?.trim() || null;
    }

    if (updateSaleCampaignDto.isActive !== undefined) {
      data.isActive = updateSaleCampaignDto.isActive;
    }

    if (updateSaleCampaignDto.startDate !== undefined) {
      data.startDate = updateSaleCampaignDto.startDate
        ? new Date(updateSaleCampaignDto.startDate)
        : null;
    }

    if (updateSaleCampaignDto.endDate !== undefined) {
      data.endDate = updateSaleCampaignDto.endDate
        ? new Date(updateSaleCampaignDto.endDate)
        : null;
    }

    if (updateSaleCampaignDto.type !== undefined) {
      data.type = updateSaleCampaignDto.type;

      if (updateSaleCampaignDto.type === 'EVENEMENT_SIMPLE') {
        data.discountValue = null;
        data.buyQuantity = null;
        data.freeQuantity = null;
      }

      if (
        updateSaleCampaignDto.type === 'REMISE_POURCENTAGE' ||
        updateSaleCampaignDto.type === 'REMISE_MONTANT_FIXE'
      ) {
        data.buyQuantity = null;
        data.freeQuantity = null;
      }

      if (updateSaleCampaignDto.type === 'ACHETEZ_X_OBTENEZ_Y') {
        data.discountValue = null;
      }
    }

    if (updateSaleCampaignDto.discountValue !== undefined) {
      data.discountValue =
        effectiveType === 'REMISE_POURCENTAGE' ||
        effectiveType === 'REMISE_MONTANT_FIXE'
          ? updateSaleCampaignDto.discountValue
          : null;
    }

    if (updateSaleCampaignDto.buyQuantity !== undefined) {
      data.buyQuantity =
        effectiveType === 'ACHETEZ_X_OBTENEZ_Y'
          ? updateSaleCampaignDto.buyQuantity
          : null;
    }

    if (updateSaleCampaignDto.freeQuantity !== undefined) {
      data.freeQuantity =
        effectiveType === 'ACHETEZ_X_OBTENEZ_Y'
          ? updateSaleCampaignDto.freeQuantity
          : null;
    }

    if (updateSaleCampaignDto.displayOnHome !== undefined) {
      data.displayOnHome = updateSaleCampaignDto.displayOnHome;
    }

    if (updateSaleCampaignDto.heroTitle !== undefined) {
      data.heroTitle = updateSaleCampaignDto.heroTitle?.trim() || null;
    }

    if (updateSaleCampaignDto.heroSubtitle !== undefined) {
      data.heroSubtitle = updateSaleCampaignDto.heroSubtitle?.trim() || null;
    }

    if (updateSaleCampaignDto.mediaType !== undefined) {
      data.mediaType = updateSaleCampaignDto.mediaType ?? null;
    }

    if (updateSaleCampaignDto.mediaUrl !== undefined) {
      data.mediaUrl = updateSaleCampaignDto.mediaUrl?.trim() || null;
    }

    if (updateSaleCampaignDto.mediaPath !== undefined) {
      data.mediaPath = updateSaleCampaignDto.mediaPath?.trim() || null;
    }

    if (updateSaleCampaignDto.position !== undefined) {
      data.position = updateSaleCampaignDto.position;
    }

    const updatedCampaign = await this.prisma.saleCampaign.update({
      where: { id },
      data: data as any,
    });

    if (
      updateSaleCampaignDto.mediaPath !== undefined &&
      currentCampaign.mediaPath &&
      currentCampaign.mediaPath !== updatedCampaign.mediaPath
    ) {
      await this.mediaStorageService.deleteMany([
        currentCampaign.mediaPath,
      ]);
    }

    return updatedCampaign;
  }

  async updateStatus(
    id: string,
    updateSaleCampaignStatusDto: UpdateSaleCampaignStatusDto,
  ) {
    await this.findOne(id);

    return this.prisma.saleCampaign.update({
      where: { id },
      data: {
        isActive: updateSaleCampaignStatusDto.isActive,
      },
    });
  }

  private activeCampaignWhere() {
    const now = new Date();

    return {
      isActive: true,
      OR: [
        {
          startDate: null,
          endDate: null,
        },
        {
          startDate: {
            lte: now,
          },
          endDate: {
            gte: now,
          },
        },
        {
          startDate: null,
          endDate: {
            gte: now,
          },
        },
        {
          startDate: {
            lte: now,
          },
          endDate: null,
        },
      ],
    };
  }

  private validateDates(params: {
    startDate?: string | null;
    endDate?: string | null;
  }) {
    if (
      params.startDate &&
      params.endDate &&
      new Date(params.startDate).getTime() > new Date(params.endDate).getTime()
    ) {
      throw new BadRequestException(
        'La date de début doit être avant la date de fin.',
      );
    }
  }

  private validateCampaignRule(params: {
    type: CampaignType;
    discountValue?: number | null;
    buyQuantity?: number | null;
    freeQuantity?: number | null;
  }) {
    if (params.type === 'REMISE_POURCENTAGE') {
      if (
        params.discountValue === undefined ||
        params.discountValue === null ||
        params.discountValue <= 0
      ) {
        throw new BadRequestException(
          'La remise en pourcentage doit être supérieure à 0.',
        );
      }

      if (params.discountValue > 100) {
        throw new BadRequestException(
          'La remise en pourcentage ne peut pas dépasser 100%.',
        );
      }
    }

    if (params.type === 'REMISE_MONTANT_FIXE') {
      if (
        params.discountValue === undefined ||
        params.discountValue === null ||
        params.discountValue <= 0
      ) {
        throw new BadRequestException(
          'La remise fixe doit être supérieure à 0.',
        );
      }
    }

    if (params.type === 'ACHETEZ_X_OBTENEZ_Y') {
      if (!params.buyQuantity || params.buyQuantity <= 0) {
        throw new BadRequestException(
          'La quantité à acheter doit être supérieure à 0.',
        );
      }

      if (!params.freeQuantity || params.freeQuantity <= 0) {
        throw new BadRequestException(
          'La quantité offerte doit être supérieure à 0.',
        );
      }
    }
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
