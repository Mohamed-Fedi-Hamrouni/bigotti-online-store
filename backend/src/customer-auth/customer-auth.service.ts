import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
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

    return this.prisma.order.findMany({
      where: {
        OR: [
          {
            customerId: customer.id,
          },
          {
            customerPhone: customer.phone,
          },
          ...(customer.email
            ? [
                {
                  customerEmail: customer.email,
                },
              ]
            : []),
        ],
      },
      include: {
        items: true,
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
