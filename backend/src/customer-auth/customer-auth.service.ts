import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeCustomerPasswordDto } from './dto/change-customer-password.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import type { CustomerTokenPayload } from './types/customer-token-payload.type';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterCustomerDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    const existingAccount = await this.prisma.customer.findFirst({
      where: {
        email,
        passwordHash: {
          not: null,
        },
      },
    });

    if (existingAccount) {
      throw new ConflictException(
        'Un compte client existe déjà avec cet email.',
      );
    }

    const passwordHash = await hash(dto.password, 10);

    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    const customer = existingCustomer
      ? await this.prisma.customer.update({
          where: {
            id: existingCustomer.id,
          },
          data: {
            fullName: dto.fullName.trim(),
            phone,
            email,
            passwordHash,
            isActive: true,
          },
        })
      : await this.prisma.customer.create({
          data: {
            fullName: dto.fullName.trim(),
            phone,
            email,
            passwordHash,
            isActive: true,
          },
        });

    return {
      accessToken: this.signCustomerToken(customer.id, email),
      customer: this.sanitizeCustomer(customer),
    };
  }

  async login(dto: LoginCustomerDto) {
    const email = dto.email.trim().toLowerCase();

    const customer = await this.prisma.customer.findFirst({
      where: {
        email,
        passwordHash: {
          not: null,
        },
      },
    });

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    if (!customer.isActive) {
      throw new UnauthorizedException('Compte client désactivé.');
    }

    const isPasswordValid = await compare(dto.password, customer.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    return {
      accessToken: this.signCustomerToken(customer.id, email),
      customer: this.sanitizeCustomer(customer),
    };
  }

  async me(authorization?: string) {
    const payload = this.verifyAuthorizationHeader(authorization);

    const customer = await this.prisma.customer.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!customer || !customer.passwordHash || !customer.isActive) {
      throw new UnauthorizedException('Session client invalide.');
    }

    return this.sanitizeCustomer(customer);
  }

  async updateProfile(dto: UpdateCustomerProfileDto, authorization?: string) {
    const payload = this.verifyAuthorizationHeader(authorization);

    const customer = await this.prisma.customer.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!customer || !customer.passwordHash || !customer.isActive) {
      throw new UnauthorizedException('Session client invalide.');
    }

    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    const existingEmail = await this.prisma.customer.findFirst({
      where: {
        email,
        id: {
          not: customer.id,
        },
        passwordHash: {
          not: null,
        },
      },
    });

    if (existingEmail) {
      throw new ConflictException(
        'Cet email est déjà utilisé par un autre compte.',
      );
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        fullName: dto.fullName.trim(),
        phone,
        email,
      },
    });

    return this.sanitizeCustomer(updatedCustomer);
  }

  async changePassword(dto: ChangeCustomerPasswordDto, authorization?: string) {
    const payload = this.verifyAuthorizationHeader(authorization);

    const customer = await this.prisma.customer.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!customer || !customer.passwordHash || !customer.isActive) {
      throw new UnauthorizedException('Session client invalide.');
    }

    const isCurrentPasswordValid = await compare(
      dto.currentPassword,
      customer.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent du mot de passe actuel.',
      );
    }

    const newPasswordHash = await hash(dto.newPassword, 10);

    await this.prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return {
      message: 'Mot de passe mis à jour avec succès.',
    };
  }

  async getCustomerOrders(authorization?: string) {
    const payload = this.verifyAuthorizationHeader(authorization);

    const customer = await this.prisma.customer.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!customer || !customer.passwordHash || !customer.isActive) {
      throw new UnauthorizedException('Session client invalide.');
    }

    const orderFilters: any[] = [
      {
        customerId: customer.id,
      },
      {
        customerPhone: customer.phone,
      },
    ];

    if (customer.email) {
      orderFilters.push({
        customerEmail: customer.email,
      });
    }

    const orders = await this.prisma.order.findMany({
      where: {
        OR: orderFilters,
      },
      include: {
        items: true,
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map(({ payment, ...order }) => ({
      ...order,
      payments: payment ? [payment] : [],
    }));
  }

  private signCustomerToken(customerId: string, email: string) {
    const payload: CustomerTokenPayload = {
      sub: customerId,
      email,
      type: 'CUSTOMER',
    };

    return this.jwtService.sign(payload);
  }

  private verifyAuthorizationHeader(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token client manquant.');
    }

    const token = authorization.replace('Bearer ', '').trim();

    try {
      const payload = this.jwtService.verify<CustomerTokenPayload>(token);

      if (payload.type !== 'CUSTOMER') {
        throw new UnauthorizedException('Token client invalide.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Token client invalide.');
    }
  }

  private sanitizeCustomer<T extends { passwordHash?: string | null }>(
    customer: T,
  ) {
    const { passwordHash, ...safeCustomer } = customer;
    return safeCustomer;
  }
}
