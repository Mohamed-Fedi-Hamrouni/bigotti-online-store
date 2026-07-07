import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthRequestContext,
  AuthSessionService,
} from '../auth/services/auth-session.service';
import { LoginAttemptsService } from '../auth/services/login-attempts.service';
import { ChangeCustomerPasswordDto } from './dto/change-customer-password.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import type {
  AnyCustomerTokenPayload,
  CustomerTokenPayload,
} from './types/customer-token-payload.type';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async register(dto: RegisterCustomerDto, context: AuthRequestContext = {}) {
    const fullName = this.normalizeFullName(dto.fullName);
    const email = this.normalizeEmail(dto.email);
    const phone = this.normalizePhone(dto.phone);

    const registeredWithEmail = await this.prisma.customer.findFirst({
      where: {
        email,
        passwordHash: {
          not: null,
        },
      },
    });

    if (registeredWithEmail) {
      throw new ConflictException(
        'Un compte client existe déjà avec cet email.',
      );
    }

    const registeredWithPhone = await this.prisma.customer.findFirst({
      where: {
        phone,
        passwordHash: {
          not: null,
        },
      },
    });

    if (registeredWithPhone) {
      throw new ConflictException(
        'Un compte client existe déjà avec ce numéro de téléphone.',
      );
    }

    const passwordHash = await hash(dto.password, 10);

    const existingGuestCustomer = await this.prisma.customer.findFirst({
      where: {
        passwordHash: null,
        OR: [{ email }, { phone }],
      },
    });

    const customer = existingGuestCustomer
      ? await this.prisma.customer.update({
          where: {
            id: existingGuestCustomer.id,
          },
          data: {
            fullName,
            phone,
            email,
            passwordHash,
            isActive: true,
          },
        })
      : await this.prisma.customer.create({
          data: {
            fullName,
            phone,
            email,
            passwordHash,
            isActive: true,
          },
        });

    const { session, refreshToken } =
      await this.authSessionService.createCustomerSession(
        customer.id,
        context,
      );

    return {
      accessToken: await this.signCustomerAccessToken(
        customer.id,
        email,
        session.id,
      ),
      refreshToken,
      customer: this.sanitizeCustomer(customer),
    };
  }

  async login(dto: LoginCustomerDto, context: AuthRequestContext = {}) {
    const email = this.normalizeEmail(dto.email);
    const clientIp = context.ipAddress ?? 'unknown';

    this.loginAttempts.assertCanAttempt('customer', email, clientIp);

    const customer = await this.prisma.customer.findFirst({
      where: {
        email,
        passwordHash: {
          not: null,
        },
      },
    });

    if (!customer || !customer.passwordHash) {
      this.loginAttempts.recordFailure('customer', email, clientIp);
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    if (!customer.isActive) {
      this.loginAttempts.recordFailure('customer', email, clientIp);
      throw new UnauthorizedException(
        'Compte client désactivé. Veuillez contacter la boutique.',
      );
    }

    const isPasswordValid = await compare(dto.password, customer.passwordHash);

    if (!isPasswordValid) {
      this.loginAttempts.recordFailure('customer', email, clientIp);
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    this.loginAttempts.reset('customer', email, clientIp);

    const { session, refreshToken } =
      await this.authSessionService.createCustomerSession(
        customer.id,
        context,
      );

    return {
      accessToken: await this.signCustomerAccessToken(
        customer.id,
        customer.email ?? email,
        session.id,
      ),
      refreshToken,
      customer: this.sanitizeCustomer(customer),
    };
  }

  async refresh(refreshToken: string | undefined, context: AuthRequestContext) {
    if (!refreshToken) {
      throw new UnauthorizedException('Session client expirée.');
    }

    const result = await this.authSessionService.rotateCustomerSession(
      refreshToken,
      context,
    );

    return {
      accessToken: await this.signCustomerAccessToken(
        result.customer.id,
        result.customer.email ?? '',
        result.session.id,
      ),
      refreshToken: result.refreshToken,
      customer: this.sanitizeCustomer(result.customer),
    };
  }

  async logout(refreshToken?: string) {
    await this.authSessionService.revokeCustomerSession(refreshToken);

    return {
      message: 'Déconnexion client effectuée.',
    };
  }


  async listSessions(authorization?: string) {
    const { customer, payload } =
      await this.getAuthenticatedCustomerContext(authorization);

    return this.authSessionService.listCustomerSessions(
      customer.id,
      payload.sessionId,
    );
  }

  async revokeSession(sessionId: string, authorization?: string) {
    const { customer, payload } =
      await this.getAuthenticatedCustomerContext(authorization);

    await this.authSessionService.revokeCustomerSessionById(
      customer.id,
      sessionId,
    );

    return {
      message:
        sessionId === payload.sessionId
          ? 'Session client actuelle révoquée.'
          : 'Session client révoquée.',
      currentSessionRevoked: sessionId === payload.sessionId,
    };
  }

  async revokeOtherSessions(authorization?: string) {
    const { customer, payload } =
      await this.getAuthenticatedCustomerContext(authorization);

    const revokedSessions =
      await this.authSessionService.revokeOtherCustomerSessions(
        customer.id,
        payload.sessionId,
      );

    return {
      message: 'Les autres sessions client ont été révoquées.',
      revokedSessions,
    };
  }

  async revokeAllSessions(authorization?: string) {
    const { customer } =
      await this.getAuthenticatedCustomerContext(authorization);

    const revokedSessions =
      await this.authSessionService.revokeAllCustomerSessions(customer.id);

    return {
      message: 'Toutes les sessions client ont été révoquées.',
      revokedSessions,
    };
  }

  async me(authorization?: string) {
    const customer = await this.getAuthenticatedCustomer(authorization);

    return this.sanitizeCustomer(customer);
  }

  async updateProfile(dto: UpdateCustomerProfileDto, authorization?: string) {
    const customer = await this.getAuthenticatedCustomer(authorization);

    const fullName = this.normalizeFullName(dto.fullName);
    const email = this.normalizeEmail(dto.email);
    const phone = this.normalizePhone(dto.phone);

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

    const existingPhone = await this.prisma.customer.findFirst({
      where: {
        phone,
        id: {
          not: customer.id,
        },
        passwordHash: {
          not: null,
        },
      },
    });

    if (existingPhone) {
      throw new ConflictException(
        'Ce numéro de téléphone est déjà utilisé par un autre compte.',
      );
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        fullName,
        phone,
        email,
      },
    });

    return this.sanitizeCustomer(updatedCustomer);
  }

  async changePassword(dto: ChangeCustomerPasswordDto, authorization?: string) {
    const customer = await this.getAuthenticatedCustomer(authorization);

    if (!customer.passwordHash) {
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
    const customer = await this.getAuthenticatedCustomer(authorization);

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

  private async getAuthenticatedCustomer(authorization?: string) {
    const { customer } =
      await this.getAuthenticatedCustomerContext(authorization);

    return customer;
  }

  private async getAuthenticatedCustomerContext(authorization?: string) {
    const payload = this.verifyAuthorizationHeader(authorization);

    if (!('sessionId' in payload) || !payload.sessionId) {
      throw new UnauthorizedException('Session client invalide.');
    }

    const session = await this.authSessionService.getActiveCustomerSession(
      payload.sessionId,
    );

    const customer = session.customer;

    if (customer.id !== payload.sub) {
      throw new UnauthorizedException(
        'Session client expirée. Veuillez vous reconnecter.',
      );
    }

    return {
      customer,
      payload,
      session,
    };
  }

  private async signCustomerAccessToken(
    customerId: string,
    email: string,
    sessionId: string,
  ) {
    const payload: CustomerTokenPayload = {
      sub: customerId,
      email,
      sessionId,
      tokenType: 'customer',
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '30m',
    });
  }

  private verifyAuthorizationHeader(authorization?: string) {
    if (!authorization) {
      throw new UnauthorizedException('Token client manquant.');
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token client manquant.');
    }

    try {
      const payload = this.jwtService.verify<AnyCustomerTokenPayload>(token);

      const isCurrentCustomerToken =
        'tokenType' in payload && payload.tokenType === 'customer';

      if (!payload.sub || !payload.email || !isCurrentCustomerToken) {
        throw new UnauthorizedException('Token client invalide.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Token client invalide ou expiré.');
    }
  }

  private normalizeFullName(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizePhone(value: string) {
    return value.trim().replace(/\s+/g, '');
  }

  private sanitizeCustomer<T extends { passwordHash?: string | null }>(
    customer: T,
  ) {
    const { passwordHash, ...safeCustomer } = customer;
    return safeCustomer;
  }
}
