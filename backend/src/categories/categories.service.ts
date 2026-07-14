import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryTypeDto, CreateCategoryDto } from './dto/create-category.dto';
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

    this.ensureUniqueTypeSlugs(createCategoryDto.types ?? []);

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name.trim(),
        slug,
        description: createCategoryDto.description?.trim() || null,
        menuGroup: createCategoryDto.menuGroup ?? 'AUTRE',
        isActive: createCategoryDto.isActive ?? true,
        types: {
          create: (createCategoryDto.types ?? []).map((type, index) => ({
            name: type.name.trim(),
            slug: this.generateSlug(type.slug ?? type.name),
            description: type.description?.trim() || null,
            isActive: type.isActive ?? true,
            position: type.position ?? index,
          })),
        },
      } as any,
      include: this.defaultInclude(),
    });
  }

  async findPublicCategories() {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
      },
      include: {
        types: {
          where: {
            isActive: true,
          },
          orderBy: [
            {
              position: 'asc',
            },
            {
              name: 'asc',
            },
          ],
        },
      },
      orderBy: [
        {
          menuGroup: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async findAllForAdmin() {
    return this.prisma.category.findMany({
      include: this.defaultInclude(),
      orderBy: [
        {
          menuGroup: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable.');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};

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

    if (updateCategoryDto.menuGroup !== undefined) {
      data.menuGroup = updateCategoryDto.menuGroup;
    }

    if (updateCategoryDto.isActive !== undefined) {
      data.isActive = updateCategoryDto.isActive;
    }

    if (updateCategoryDto.types !== undefined) {
      this.ensureUniqueTypeSlugs(updateCategoryDto.types);

      data.types = {
        deleteMany: {},
        create: updateCategoryDto.types.map((type, index) => ({
          name: type.name.trim(),
          slug: this.generateSlug(type.slug ?? type.name),
          description: type.description?.trim() || null,
          isActive: type.isActive ?? true,
          position: type.position ?? index,
        })),
      };
    }

    return this.prisma.category.update({
      where: { id },
      data: data as any,
      include: this.defaultInclude(),
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
      include: this.defaultInclude(),
    });
  }

  private defaultInclude() {
    return {
      types: {
        orderBy: [
          {
            position: 'asc' as const,
          },
          {
            name: 'asc' as const,
          },
        ],
      },
    };
  }

  private ensureUniqueTypeSlugs(types: CategoryTypeDto[]) {
    const slugs = types.map((type) =>
      this.generateSlug(type.slug ?? type.name),
    );
    const uniqueSlugs = new Set(slugs);

    if (slugs.length !== uniqueSlugs.size) {
      throw new ConflictException(
        'Les types de cette catégorie doivent avoir des noms ou slugs uniques.',
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
