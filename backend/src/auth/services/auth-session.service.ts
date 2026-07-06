import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export type AuthRequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

const ADMIN_REFRESH_TOKEN_DAYS = 7;
const CUSTOMER_REFRESH_TOKEN_DAYS = 30;

@Injectable()
export class AuthSessionService {
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
