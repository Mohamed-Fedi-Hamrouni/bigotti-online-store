import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export type AuthRequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

export type AuthSessionView = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isCurrent: boolean;
};

const ADMIN_REFRESH_TOKEN_DAYS = 7;
const CUSTOMER_REFRESH_TOKEN_DAYS = 30;
const REVOKED_SESSION_RETENTION_DAYS = 30;

@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAdminSession(userId: string, context: AuthRequestContext) {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.prisma.adminSession.create({
      data: {
        userId,
        refreshTokenHash,
        userAgent: this.normalizeOptionalValue(context.userAgent),
        ipAddress: this.normalizeOptionalValue(context.ipAddress),
        expiresAt: this.buildExpiryDate(ADMIN_REFRESH_TOKEN_DAYS),
      },
    });

    return {
      session,
      refreshToken,
    };
  }

  async createCustomerSession(customerId: string, context: AuthRequestContext) {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.prisma.customerSession.create({
      data: {
        customerId,
        refreshTokenHash,
        userAgent: this.normalizeOptionalValue(context.userAgent),
        ipAddress: this.normalizeOptionalValue(context.ipAddress),
        expiresAt: this.buildExpiryDate(CUSTOMER_REFRESH_TOKEN_DAYS),
      },
    });

    return {
      session,
      refreshToken,
    };
  }

  async rotateAdminSession(refreshToken: string, context: AuthRequestContext) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const currentSession = await transaction.adminSession.findUnique({
        where: {
          refreshTokenHash,
        },
        include: {
          user: true,
        },
      });

      if (
        !currentSession ||
        currentSession.revokedAt ||
        currentSession.expiresAt <= now
      ) {
        throw new UnauthorizedException('Session administrateur expirée.');
      }

      if (!currentSession.user.isActive) {
        throw new UnauthorizedException('Compte administrateur désactivé.');
      }

      const nextRefreshToken = this.generateRefreshToken();

      const rotationResult = await transaction.adminSession.updateMany({
        where: {
          id: currentSession.id,
          refreshTokenHash,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          refreshTokenHash: this.hashRefreshToken(nextRefreshToken),
          userAgent: this.normalizeOptionalValue(context.userAgent),
          ipAddress: this.normalizeOptionalValue(context.ipAddress),
          expiresAt: this.buildExpiryDate(ADMIN_REFRESH_TOKEN_DAYS),
          revokedAt: null,
        },
      });

      if (rotationResult.count !== 1) {
        throw new UnauthorizedException(
          'Ce jeton de session administrateur a déjà été utilisé.',
        );
      }

      const updatedSession = await transaction.adminSession.findUnique({
        where: {
          id: currentSession.id,
        },
        include: {
          user: true,
        },
      });

      if (!updatedSession) {
        throw new UnauthorizedException('Session administrateur expirée.');
      }

      return {
        session: updatedSession,
        user: updatedSession.user,
        refreshToken: nextRefreshToken,
      };
    });
  }

  async rotateCustomerSession(
    refreshToken: string,
    context: AuthRequestContext,
  ) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const currentSession = await transaction.customerSession.findUnique({
        where: {
          refreshTokenHash,
        },
        include: {
          customer: {
            include: {
              identities: {
                select: {
                  id: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      if (
        !currentSession ||
        currentSession.revokedAt ||
        currentSession.expiresAt <= now
      ) {
        throw new UnauthorizedException('Session client expirée.');
      }

      this.assertCustomerCanAuthenticate(currentSession.customer);

      const nextRefreshToken = this.generateRefreshToken();

      const rotationResult = await transaction.customerSession.updateMany({
        where: {
          id: currentSession.id,
          refreshTokenHash,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          refreshTokenHash: this.hashRefreshToken(nextRefreshToken),
          userAgent: this.normalizeOptionalValue(context.userAgent),
          ipAddress: this.normalizeOptionalValue(context.ipAddress),
          expiresAt: this.buildExpiryDate(CUSTOMER_REFRESH_TOKEN_DAYS),
          revokedAt: null,
        },
      });

      if (rotationResult.count !== 1) {
        throw new UnauthorizedException(
          'Ce jeton de session client a déjà été utilisé.',
        );
      }

      const updatedSession = await transaction.customerSession.findUnique({
        where: {
          id: currentSession.id,
        },
        include: {
          customer: {
            include: {
              identities: {
                select: {
                  id: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      if (!updatedSession) {
        throw new UnauthorizedException('Session client expirée.');
      }

      const customer = this.removeIdentityMetadata(updatedSession.customer);

      return {
        session: {
          ...updatedSession,
          customer,
        },
        customer,
        refreshToken: nextRefreshToken,
      };
    });
  }

  async getActiveAdminSession(sessionId: string) {
    const session = await this.prisma.adminSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session administrateur expirée.');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('Compte administrateur désactivé.');
    }

    return session;
  }

  async getActiveCustomerSession(sessionId: string) {
    const session = await this.prisma.customerSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        customer: {
          include: {
            identities: {
              select: {
                id: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session client expirée.');
    }

    this.assertCustomerCanAuthenticate(session.customer);

    return {
      ...session,
      customer: this.removeIdentityMetadata(session.customer),
    };
  }

  async listAdminSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<AuthSessionView[]> {
    const sessions = await this.prisma.adminSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      isCurrent: session.id === currentSessionId,
    }));
  }

  async listCustomerSessions(
    customerId: string,
    currentSessionId: string,
  ): Promise<AuthSessionView[]> {
    const sessions = await this.prisma.customerSession.findMany({
      where: {
        customerId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      isCurrent: session.id === currentSessionId,
    }));
  }

  async revokeAdminSessionById(userId: string, sessionId: string) {
    const result = await this.prisma.adminSession.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Session administrateur introuvable.');
    }
  }

  async revokeCustomerSessionById(customerId: string, sessionId: string) {
    const result = await this.prisma.customerSession.updateMany({
      where: {
        id: sessionId,
        customerId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Session client introuvable.');
    }
  }

  async revokeOtherAdminSessions(userId: string, currentSessionId: string) {
    const result = await this.prisma.adminSession.updateMany({
      where: {
        userId,
        id: {
          not: currentSessionId,
        },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  async revokeOtherCustomerSessions(
    customerId: string,
    currentSessionId: string,
  ) {
    const result = await this.prisma.customerSession.updateMany({
      where: {
        customerId,
        id: {
          not: currentSessionId,
        },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  async revokeAllAdminSessions(userId: string) {
    const result = await this.prisma.adminSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  async revokeAllCustomerSessions(customerId: string) {
    const result = await this.prisma.customerSession.updateMany({
      where: {
        customerId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  async revokeAdminSession(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    await this.prisma.adminSession.updateMany({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeCustomerSession(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    await this.prisma.customerSession.updateMany({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  @Cron('0 15 3 * * *', {
    name: 'auth-session-cleanup',
    timeZone: 'UTC',
    waitForCompletion: true,
  })
  async handleScheduledCleanup() {
    const result = await this.cleanupExpiredSessions();

    if (
      result.deletedAdminSessions > 0 ||
      result.deletedCustomerSessions > 0
    ) {
      this.logger.log(
        `Nettoyage des sessions : ${result.deletedAdminSessions} admin, ${result.deletedCustomerSessions} client.`,
      );
    }
  }

  async cleanupExpiredSessions() {
    const now = new Date();
    const revokedRetentionDate = new Date(now);

    revokedRetentionDate.setDate(
      revokedRetentionDate.getDate() - REVOKED_SESSION_RETENTION_DAYS,
    );

    const [adminResult, customerResult] = await this.prisma.$transaction([
      this.prisma.adminSession.deleteMany({
        where: {
          OR: [
            {
              expiresAt: {
                lte: now,
              },
            },
            {
              revokedAt: {
                lte: revokedRetentionDate,
              },
            },
          ],
        },
      }),
      this.prisma.customerSession.deleteMany({
        where: {
          OR: [
            {
              expiresAt: {
                lte: now,
              },
            },
            {
              revokedAt: {
                lte: revokedRetentionDate,
              },
            },
          ],
        },
      }),
    ]);

    return {
      deletedAdminSessions: adminResult.count,
      deletedCustomerSessions: customerResult.count,
    };
  }

  private assertCustomerCanAuthenticate(customer: {
    isActive: boolean;
    passwordHash: string | null;
    identities: Array<{ id: string }>;
  }) {
    if (!customer.isActive) {
      throw new UnauthorizedException('Compte client désactivé.');
    }

    if (!customer.passwordHash && customer.identities.length === 0) {
      throw new UnauthorizedException(
        'Compte client sans méthode d’authentification valide.',
      );
    }
  }

  private removeIdentityMetadata<
    T extends {
      identities: Array<{ id: string }>;
    },
  >(customer: T): Omit<T, 'identities'> {
    const { identities, ...safeCustomer } = customer;
    void identities;

    return safeCustomer;
  }

  private generateRefreshToken() {
    return randomBytes(64).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private buildExpiryDate(days: number) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  private normalizeOptionalValue(value?: string) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue.slice(0, 500) : undefined;
  }
}
