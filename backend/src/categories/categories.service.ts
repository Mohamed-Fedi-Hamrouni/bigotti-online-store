import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const slug = this.generateSlug(
      createCategoryDto.slug ?? createCategoryDto.name,
    );

    const existingCategory = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new ConflictException('Une catégorie avec ce slug existe déjà.');
    }

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name.trim(),
        slug,
        description: createCategoryDto.description?.trim() || null,
        isActive: createCategoryDto.isActive ?? true,
      },
    });
  }

  async findPublicCategories() {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findAllForAdmin() {
    return this.prisma.category.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable.');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (updateCategoryDto.name !== undefined) {
      data.name = updateCategoryDto.name.trim();
    }

    if (updateCategoryDto.slug !== undefined) {
      const slug = this.generateSlug(updateCategoryDto.slug);

      const existingCategory = await this.prisma.category.findUnique({
        where: { slug },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException('Une catégorie avec ce slug existe déjà.');
      }

      data.slug = slug;
    }

    if (updateCategoryDto.description !== undefined) {
      data.description = updateCategoryDto.description?.trim() || null;
    }

    if (updateCategoryDto.isActive !== undefined) {
      data.isActive = updateCategoryDto.isActive;
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    updateCategoryStatusDto: UpdateCategoryStatusDto,
  ) {
    await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data: {
        isActive: updateCategoryStatusDto.isActive,
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
