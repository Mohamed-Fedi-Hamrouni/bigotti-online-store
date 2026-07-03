import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionStatusDto } from './dto/update-collection-status.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCollectionDto: CreateCollectionDto) {
    const slug = this.generateSlug(
      createCollectionDto.slug ?? createCollectionDto.name,
    );

    const existingCollection = await this.prisma.collection.findUnique({
      where: { slug },
    });

    if (existingCollection) {
      throw new ConflictException('Une collection avec ce slug existe déjà.');
    }

    this.validateCollectionDates({
      startDate: createCollectionDto.startDate,
      endDate: createCollectionDto.endDate,
    });

    this.validateCollectionPromo({
      promoIsActive: createCollectionDto.promoIsActive ?? false,
      promoPercentage: createCollectionDto.promoPercentage ?? null,
      promoStartDate: createCollectionDto.promoStartDate ?? null,
      promoEndDate: createCollectionDto.promoEndDate ?? null,
    });

    const promoIsActive = createCollectionDto.promoIsActive ?? false;

    return this.prisma.collection.create({
      data: {
        name: createCollectionDto.name.trim(),
        slug,
        description: createCollectionDto.description?.trim() || null,
        isActive: createCollectionDto.isActive ?? true,
        isFeatured: createCollectionDto.isFeatured ?? false,
        startDate: createCollectionDto.startDate
          ? new Date(createCollectionDto.startDate)
          : null,
        endDate: createCollectionDto.endDate
          ? new Date(createCollectionDto.endDate)
          : null,
        promoIsActive,
        promoPercentage: promoIsActive
          ? (createCollectionDto.promoPercentage ?? null)
          : null,
        promoStartDate:
          promoIsActive && createCollectionDto.promoStartDate
            ? new Date(createCollectionDto.promoStartDate)
            : null,
        promoEndDate:
          promoIsActive && createCollectionDto.promoEndDate
            ? new Date(createCollectionDto.promoEndDate)
            : null,
      },
    });
  }

  async findPublicCollections() {
    return this.prisma.collection.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          isFeatured: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findAllForAdmin() {
    return this.prisma.collection.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException('Collection introuvable.');
    }

    return collection;
  }

  async update(id: string, updateCollectionDto: UpdateCollectionDto) {
    const currentCollection = await this.findOne(id);

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      isActive?: boolean;
      isFeatured?: boolean;
      startDate?: Date | null;
      endDate?: Date | null;
      promoIsActive?: boolean;
      promoPercentage?: number | null;
      promoStartDate?: Date | null;
      promoEndDate?: Date | null;
    } = {};

    const effectiveStartDate =
      updateCollectionDto.startDate !== undefined
        ? updateCollectionDto.startDate
        : (currentCollection.startDate?.toISOString() ?? null);

    const effectiveEndDate =
      updateCollectionDto.endDate !== undefined
        ? updateCollectionDto.endDate
        : (currentCollection.endDate?.toISOString() ?? null);

    this.validateCollectionDates({
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    });

    const effectivePromoIsActive =
      updateCollectionDto.promoIsActive ?? currentCollection.promoIsActive;

    const effectivePromoPercentage =
      updateCollectionDto.promoPercentage !== undefined
        ? updateCollectionDto.promoPercentage
        : currentCollection.promoPercentage !== null
          ? Number(currentCollection.promoPercentage)
          : null;

    const effectivePromoStartDate =
      updateCollectionDto.promoStartDate !== undefined
        ? updateCollectionDto.promoStartDate
        : (currentCollection.promoStartDate?.toISOString() ?? null);

    const effectivePromoEndDate =
      updateCollectionDto.promoEndDate !== undefined
        ? updateCollectionDto.promoEndDate
        : (currentCollection.promoEndDate?.toISOString() ?? null);

    this.validateCollectionPromo({
      promoIsActive: effectivePromoIsActive,
      promoPercentage: effectivePromoPercentage,
      promoStartDate: effectivePromoStartDate,
      promoEndDate: effectivePromoEndDate,
    });

    if (updateCollectionDto.name !== undefined) {
      data.name = updateCollectionDto.name.trim();
    }

    if (updateCollectionDto.slug !== undefined) {
      const slug = this.generateSlug(updateCollectionDto.slug);

      const existingCollection = await this.prisma.collection.findUnique({
        where: { slug },
      });

      if (existingCollection && existingCollection.id !== id) {
        throw new ConflictException('Une collection avec ce slug existe déjà.');
      }

      data.slug = slug;
    }

    if (updateCollectionDto.description !== undefined) {
      data.description = updateCollectionDto.description?.trim() || null;
    }

    if (updateCollectionDto.isActive !== undefined) {
      data.isActive = updateCollectionDto.isActive;
    }

    if (updateCollectionDto.isFeatured !== undefined) {
      data.isFeatured = updateCollectionDto.isFeatured;
    }

    if (updateCollectionDto.startDate !== undefined) {
      data.startDate = updateCollectionDto.startDate
        ? new Date(updateCollectionDto.startDate)
        : null;
    }

    if (updateCollectionDto.endDate !== undefined) {
      data.endDate = updateCollectionDto.endDate
        ? new Date(updateCollectionDto.endDate)
        : null;
    }

    if (updateCollectionDto.promoIsActive !== undefined) {
      data.promoIsActive = updateCollectionDto.promoIsActive;

      if (!updateCollectionDto.promoIsActive) {
        data.promoPercentage = null;
        data.promoStartDate = null;
        data.promoEndDate = null;
      }
    }

    if (
      effectivePromoIsActive &&
      updateCollectionDto.promoPercentage !== undefined
    ) {
      data.promoPercentage = updateCollectionDto.promoPercentage;
    }

    if (
      effectivePromoIsActive &&
      updateCollectionDto.promoStartDate !== undefined
    ) {
      data.promoStartDate = updateCollectionDto.promoStartDate
        ? new Date(updateCollectionDto.promoStartDate)
        : null;
    }

    if (
      effectivePromoIsActive &&
      updateCollectionDto.promoEndDate !== undefined
    ) {
      data.promoEndDate = updateCollectionDto.promoEndDate
        ? new Date(updateCollectionDto.promoEndDate)
        : null;
    }

    return this.prisma.collection.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    updateCollectionStatusDto: UpdateCollectionStatusDto,
  ) {
    await this.findOne(id);

    return this.prisma.collection.update({
      where: { id },
      data: {
        isActive: updateCollectionStatusDto.isActive,
      },
    });
  }

  private validateCollectionDates(params: {
    startDate?: string | null;
    endDate?: string | null;
  }) {
    if (
      params.startDate &&
      params.endDate &&
      new Date(params.startDate).getTime() > new Date(params.endDate).getTime()
    ) {
      throw new BadRequestException(
        'La date de début de collection doit être avant la date de fin.',
      );
    }
  }

  private validateCollectionPromo(params: {
    promoIsActive: boolean;
    promoPercentage?: number | null;
    promoStartDate?: string | null;
    promoEndDate?: string | null;
  }) {
    if (!params.promoIsActive) {
      return;
    }

    if (
      params.promoPercentage === undefined ||
      params.promoPercentage === null ||
      !Number.isFinite(Number(params.promoPercentage)) ||
      Number(params.promoPercentage) <= 0
    ) {
      throw new BadRequestException(
        'Le pourcentage de promotion collection doit être supérieur à 0.',
      );
    }

    if (Number(params.promoPercentage) > 100) {
      throw new BadRequestException(
        'La promotion collection ne peut pas dépasser 100%.',
      );
    }

    if (
      params.promoStartDate &&
      params.promoEndDate &&
      new Date(params.promoStartDate).getTime() >
        new Date(params.promoEndDate).getTime()
    ) {
      throw new BadRequestException(
        'La date de début de promotion doit être avant la date de fin.',
      );
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
