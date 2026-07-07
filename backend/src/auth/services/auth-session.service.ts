import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

  async createAdminSession(userId: string, context: AuthRequestContext) {
    await this.cleanupExpiredSessions();

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
    await this.cleanupExpiredSessions();

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
    const session = await this.prisma.adminSession.findUnique({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
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

    const nextRefreshToken = this.generateRefreshToken();

    const updatedSession = await this.prisma.adminSession.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: this.hashRefreshToken(nextRefreshToken),
        userAgent: this.normalizeOptionalValue(context.userAgent),
        ipAddress: this.normalizeOptionalValue(context.ipAddress),
        expiresAt: this.buildExpiryDate(ADMIN_REFRESH_TOKEN_DAYS),
        revokedAt: null,
      },
      include: {
        user: true,
      },
    });

    return {
      session: updatedSession,
      user: updatedSession.user,
      refreshToken: nextRefreshToken,
    };
  }

  async rotateCustomerSession(
    refreshToken: string,
    context: AuthRequestContext,
  ) {
    const session = await this.prisma.customerSession.findUnique({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
      },
      include: {
        customer: true,
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session client expirée.');
    }

    if (!session.customer.isActive || !session.customer.passwordHash) {
      throw new UnauthorizedException('Compte client désactivé ou invalide.');
    }

    const nextRefreshToken = this.generateRefreshToken();

    const updatedSession = await this.prisma.customerSession.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: this.hashRefreshToken(nextRefreshToken),
        userAgent: this.normalizeOptionalValue(context.userAgent),
        ipAddress: this.normalizeOptionalValue(context.ipAddress),
        expiresAt: this.buildExpiryDate(CUSTOMER_REFRESH_TOKEN_DAYS),
        revokedAt: null,
      },
      include: {
        customer: true,
      },
    });

    return {
      session: updatedSession,
      customer: updatedSession.customer,
      refreshToken: nextRefreshToken,
    };
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
        customer: true,
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session client expirée.');
    }

    if (!session.customer.isActive || !session.customer.passwordHash) {
      throw new UnauthorizedException('Compte client désactivé ou invalide.');
    }

    return session;
  }

  async listAdminSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<AuthSessionView[]> {
    await this.cleanupExpiredSessions();

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
    await this.cleanupExpiredSessions();

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
