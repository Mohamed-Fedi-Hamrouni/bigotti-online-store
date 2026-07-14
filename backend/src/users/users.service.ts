import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: createUserDto.fullName.trim(),
        email,
        passwordHash,
        role: createUserDto.role,
        isActive: true,
      },
    });

    return this.toSafeUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return this.toSafeUser(user);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto, currentUser: JwtPayload) {
    if (id === currentUser.sub) {
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle.');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('Utilisateur introuvable.');

      if (user.role === 'SUPER_ADMIN' && user.isActive && dto.role !== 'SUPER_ADMIN') {
        const count = await tx.user.count({
          where: { role: 'SUPER_ADMIN', isActive: true },
        });
        if (count <= 1) {
          throw new BadRequestException(
            'Le dernier super administrateur actif ne peut pas être rétrogradé.',
          );
        }
      }

      const updated = await tx.user.update({ where: { id }, data: { role: dto.role } });
      await tx.adminSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    }, { isolationLevel: 'Serializable' });

    return this.toSafeUser(updatedUser);
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    currentUser: JwtPayload,
  ) {
    if (id === currentUser.sub && !dto.isActive) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte.');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('Utilisateur introuvable.');

      if (user.role === 'SUPER_ADMIN' && user.isActive && !dto.isActive) {
        const count = await tx.user.count({
          where: { role: 'SUPER_ADMIN', isActive: true },
        });
        if (count <= 1) {
          throw new BadRequestException(
            'Le dernier super administrateur actif ne peut pas être désactivé.',
          );
        }
      }

      const updated = await tx.user.update({
        where: { id },
        data: { isActive: dto.isActive },
      });
      if (!dto.isActive) {
        await tx.adminSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return updated;
    }, { isolationLevel: 'Serializable' });

    return this.toSafeUser(updatedUser);
  }

  private toSafeUser(user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
