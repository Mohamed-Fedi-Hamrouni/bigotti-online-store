import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleCampaignDto } from './dto/create-sale-campaign.dto';
import { UpdateSaleCampaignStatusDto } from './dto/update-sale-campaign-status.dto';
import { UpdateSaleCampaignDto } from './dto/update-sale-campaign.dto';

@Injectable()
export class SaleCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
  }

  async findPublicCampaigns() {
    const now = new Date();

    return this.prisma.saleCampaign.findMany({
      where: {
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllForAdmin() {
    return this.prisma.saleCampaign.findMany({
      orderBy: {
        createdAt: 'desc',
      },
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
    await this.findOne(id);

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      isActive?: boolean;
      startDate?: Date | null;
      endDate?: Date | null;
    } = {};

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

    return this.prisma.saleCampaign.update({
      where: { id },
      data,
    });
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

  private generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
