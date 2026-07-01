import {
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
    await this.findOne(id);

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      isActive?: boolean;
      isFeatured?: boolean;
      startDate?: Date | null;
      endDate?: Date | null;
    } = {};

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

  private generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
