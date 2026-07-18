import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { GoogleCredentialDto } from './dto/google-credential.dto';
import { GoogleRegisterCustomerDto } from './dto/google-register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { GoogleIdentityService } from './services/google-identity.service';
import { CustomerEmailVerificationService } from './services/customer-email-verification.service';
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
    private readonly googleIdentityService: GoogleIdentityService,
    private readonly emailVerificationService: CustomerEmailVerificationService,
  ) {}

  async register(dto: RegisterCustomerDto, context: AuthRequestContext = {}) {
    const fullName = this.normalizeFullName(dto.fullName);
    const email = this.normalizeEmail(dto.email);
    const phone = this.normalizePhone(dto.phone);

    const registeredWithEmail = await this.prisma.customer.findFirst({
      where: {
        email,
        OR: [
          {
            passwordHash: {
              not: null,
            },
          },
          {
            identities: {
              some: {},
            },
          },
        ],
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
        OR: [
          {
            passwordHash: {
              not: null,
            },
          },
          {
            identities: {
              some: {},
            },
          },
        ],
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
        email,
        passwordHash: null,
        identities: {
          none: {},
        },
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
            emailVerifiedAt: null,
          },
        })
      : await this.prisma.customer.create({
          data: {
            fullName,
            phone,
            email,
            passwordHash,
            isActive: true,
            emailVerifiedAt: null,
          },
        });

    await this.emailVerificationService.sendForCustomer(customer, context);

    return {
      message:
        'Votre compte a été créé. Vérifiez votre adresse email avant de vous connecter.',
      email: customer.email,
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

    if (!customer.emailVerifiedAt) {
      throw new ForbiddenException(
        'Votre adresse email n’est pas encore vérifiée. Consultez votre boîte mail ou renvoyez l’email de vérification.',
      );
    }

    this.loginAttempts.reset('customer', email, clientIp);

    return this.createCustomerSessionResult(customer, context);
  }

  async loginWithGoogle(
    dto: GoogleCredentialDto,
    context: AuthRequestContext = {},
  ) {
    const googleIdentity = await this.googleIdentityService.verifyCredential(
      dto.credential,
    );

    const identity = await this.prisma.customerIdentity.findFirst({
      where: {
        provider: 'GOOGLE',
        providerSubject: googleIdentity.subject,
      },
      include: {
        customer: true,
      },
    });

    if (!identity) {
      throw new ConflictException(
        'Aucun compte Bigotti n’est associé à ce compte Google. Créez d’abord votre compte.',
      );
    }

    if (!identity.customer.isActive) {
      throw new UnauthorizedException(
        'Compte client désactivé. Veuillez contacter la boutique.',
      );
    }

    const verifiedAt = new Date();
    const googleVerifiesCurrentEmail =
      identity.customer.email?.toLowerCase() === googleIdentity.email;
    const verifiedCustomer = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.customerIdentity.update({
          where: { id: identity.id },
          data: {
            providerEmail: googleIdentity.email,
            emailVerified: true,
            profilePicture: googleIdentity.profilePicture,
          },
        });
        return googleVerifiesCurrentEmail
          ? transaction.customer.update({
              where: { id: identity.customer.id },
              data: { emailVerifiedAt: verifiedAt },
            })
          : identity.customer;
      },
    );

    if (!verifiedCustomer.emailVerifiedAt) {
      throw new ForbiddenException(
        'L’adresse email actuelle du compte doit être vérifiée avant la connexion.',
      );
    }

    return this.createCustomerSessionResult(verifiedCustomer, context);
  }

  async registerWithGoogle(
    dto: GoogleRegisterCustomerDto,
    context: AuthRequestContext = {},
  ) {
    const phone = this.normalizePhone(dto.phone);
    const googleIdentity = await this.googleIdentityService.verifyCredential(
      dto.credential,
    );

    const existingIdentity = await this.prisma.customerIdentity.findFirst({
      where: {
        provider: 'GOOGLE',
        providerSubject: googleIdentity.subject,
      },
      include: {
        customer: true,
      },
    });

    if (existingIdentity) {
      if (!existingIdentity.customer.isActive) {
        throw new UnauthorizedException(
          'Compte client désactivé. Veuillez contacter la boutique.',
        );
      }

      await this.prisma.customerIdentity.update({
        where: {
          id: existingIdentity.id,
        },
        data: {
          providerEmail: googleIdentity.email,
          emailVerified: true,
          profilePicture: googleIdentity.profilePicture,
        },
      });

      const verifiedCustomer =
        existingIdentity.customer.email?.toLowerCase() === googleIdentity.email
          ? await this.prisma.customer.update({
              where: { id: existingIdentity.customer.id },
              data: { emailVerifiedAt: new Date() },
            })
          : existingIdentity.customer;

      if (!verifiedCustomer.emailVerifiedAt) {
        throw new ForbiddenException(
          'L’adresse email actuelle du compte doit être vérifiée avant la connexion.',
        );
      }

      return this.createCustomerSessionResult(verifiedCustomer, context);
    }

    const registeredWithEmail = await this.prisma.customer.findFirst({
      where: {
        email: googleIdentity.email,
        OR: [
          {
            passwordHash: {
              not: null,
            },
          },
          {
            identities: {
              some: {},
            },
          },
        ],
      },
    });

    if (registeredWithEmail) {
      throw new ConflictException(
        'Un compte Bigotti existe déjà avec cet email. Connectez-vous avec votre mot de passe.',
      );
    }

    const registeredWithPhone = await this.prisma.customer.findFirst({
      where: {
        phone,
        OR: [
          {
            passwordHash: {
              not: null,
            },
          },
          {
            identities: {
              some: {},
            },
          },
        ],
      },
    });

    if (registeredWithPhone) {
      throw new ConflictException(
        'Un compte client existe déjà avec ce numéro de téléphone.',
      );
    }

    const existingGuestCustomer = await this.prisma.customer.findFirst({
      where: {
        email: googleIdentity.email,
        passwordHash: null,
        identities: {
          none: {},
        },
      },
    });

    const customer = await this.prisma
      .$transaction(async (transaction) => {
        const createdOrUpdatedCustomer = existingGuestCustomer
          ? await transaction.customer.update({
              where: {
                id: existingGuestCustomer.id,
              },
              data: {
                fullName: googleIdentity.fullName,
                phone,
                email: googleIdentity.email,
                isActive: true,
                emailVerifiedAt: new Date(),
              },
            })
          : await transaction.customer.create({
              data: {
                fullName: googleIdentity.fullName,
                phone,
                email: googleIdentity.email,
                passwordHash: null,
                isActive: true,
                emailVerifiedAt: new Date(),
              },
            });

        await transaction.customerIdentity.create({
          data: {
            customerId: createdOrUpdatedCustomer.id,
            provider: 'GOOGLE',
            providerSubject: googleIdentity.subject,
            providerEmail: googleIdentity.email,
            emailVerified: true,
            profilePicture: googleIdentity.profilePicture,
          },
        });

        return createdOrUpdatedCustomer;
      })
      .catch((error: unknown) => {
        if (this.isPrismaUniqueConstraintError(error)) {
          throw new ConflictException(
            'Ce compte Google est déjà associé à un compte Bigotti.',
          );
        }

        throw error;
      });

    return this.createCustomerSessionResult(customer, context);
  }

  async refresh(refreshToken: string | undefined, context: AuthRequestContext) {
    if (!refreshToken) {
      throw new UnauthorizedException('Session client expirée.');
    }

    const result = await this.authSessionService.rotateCustomerSession(
      refreshToken,
      context,
    );

    if (!result.customer.emailVerifiedAt) {
      await this.authSessionService.revokeCustomerSession(refreshToken);
      throw new ForbiddenException(
        'Votre adresse email doit être vérifiée avant de vous connecter.',
      );
    }

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
    const emailChanged = email !== customer.email;

    const existingEmail = await this.prisma.customer.findFirst({
      where: {
        email,
        id: {
          not: customer.id,
        },
        OR: [
          {
            passwordHash: {
              not: null,
            },
          },
          {
            identities: {
              some: {},
            },
          },
        ],
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
        OR: [
          {
            passwordHash: {
              not: null,
            },
          },
          {
            identities: {
              some: {},
            },
          },
        ],
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
        ...(emailChanged ? { emailVerifiedAt: null } : {}),
      },
    });

    if (emailChanged) {
      await this.authSessionService.revokeAllCustomerSessions(customer.id);
      await this.emailVerificationService.sendForCustomer(updatedCustomer, {});
    }

    return this.sanitizeCustomer(updatedCustomer);
  }

  async changePassword(dto: ChangeCustomerPasswordDto, authorization?: string) {
    const customer = await this.getAuthenticatedCustomer(authorization);

    if (!customer.passwordHash) {
      throw new BadRequestException(
        'Ce compte utilise Google et ne possède pas encore de mot de passe local.',
      );
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

  private async createCustomerSessionResult<
    T extends {
      id: string;
      email: string | null;
      passwordHash?: string | null;
    },
  >(customer: T, context: AuthRequestContext) {
    const { session, refreshToken } =
      await this.authSessionService.createCustomerSession(customer.id, context);

    return {
      accessToken: await this.signCustomerAccessToken(
        customer.id,
        customer.email ?? '',
        session.id,
      ),
      refreshToken,
      customer: this.sanitizeCustomer(customer),
    };
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

    if (!customer.emailVerifiedAt) {
      throw new ForbiddenException(
        'Votre adresse email doit être vérifiée avant d’accéder à votre compte.',
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

  private isPrismaUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
