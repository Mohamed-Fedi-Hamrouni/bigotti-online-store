import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export type PasswordResetRequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

const RESET_TOKEN_LIFETIME_MINUTES = 20;
const MINIMUM_RESPONSE_TIME_MS = 350;
const MAX_ACCOUNT_REQUESTS_PER_HOUR = 3;
const MAX_IP_REQUESTS_PER_HOUR = 20;
const RESET_TOKEN_RETENTION_DAYS = 30;

const GENERIC_RESPONSE = {
  message:
    'Si un compte correspond à cette adresse, un email de réinitialisation a été envoyé.',
};

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly frontendUrl: string;
  private readonly debugEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    const explicitFrontendUrl = this.configService
      .get<string>('PUBLIC_FRONTEND_URL')
      ?.trim();

    const corsFrontendUrl = this.configService
      .get<string>('FRONTEND_URL')
      ?.split(',')[0]
      ?.trim();

    this.frontendUrl = (
      explicitFrontendUrl ||
      corsFrontendUrl ||
      'http://localhost:3001'
    ).replace(/\/$/, '');

    this.debugEnabled =
      this.configService.get<string>('NODE_ENV') !== 'production' &&
      this.configService.get<string>('PASSWORD_RESET_DEBUG') === 'true';
  }

  async requestAdminReset(
    dto: ForgotPasswordDto,
    context: PasswordResetRequestContext = {},
  ) {
    const startedAt = Date.now();
    const email = this.normalizeEmail(dto.email);
    const requestIp = this.normalizeOptionalValue(context.ipAddress);
    const userAgent = this.normalizeOptionalValue(context.userAgent);

    await this.cleanupOldTokens();

    if (await this.isIpRateLimited(requestIp)) {
      await this.ensureMinimumResponseTime(startedAt);
      return GENERIC_RESPONSE;
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      await this.ensureMinimumResponseTime(startedAt);
      return GENERIC_RESPONSE;
    }

    if (await this.isAdminAccountRateLimited(user.id)) {
      await this.ensureMinimumResponseTime(startedAt);
      return GENERIC_RESPONSE;
    }

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.buildExpiryDate();
    const resetUrl = `${this.frontendUrl}/admin/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;

    const createdToken = await this.prisma.$transaction(async (transaction) => {
      await transaction.adminPasswordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return transaction.adminPasswordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          requestIp,
          userAgent,
        },
      });
    });

    await this.sendResetEmailSafely({
      accountType: 'admin',
      tokenId: createdToken.id,
      to: user.email,
      recipientName: user.fullName,
      resetUrl,
    });

    await this.ensureMinimumResponseTime(startedAt);

    return this.withDebugUrl(GENERIC_RESPONSE, resetUrl);
  }

  async requestCustomerReset(
    dto: ForgotPasswordDto,
    context: PasswordResetRequestContext = {},
  ) {
    const startedAt = Date.now();
    const email = this.normalizeEmail(dto.email);
    const requestIp = this.normalizeOptionalValue(context.ipAddress);
    const userAgent = this.normalizeOptionalValue(context.userAgent);

    await this.cleanupOldTokens();

    if (await this.isIpRateLimited(requestIp)) {
      await this.ensureMinimumResponseTime(startedAt);
      return GENERIC_RESPONSE;
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        email,
        isActive: true,
        passwordHash: {
          not: null,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!customer || !customer.email) {
      await this.ensureMinimumResponseTime(startedAt);
      return GENERIC_RESPONSE;
    }

    if (await this.isCustomerAccountRateLimited(customer.id)) {
      await this.ensureMinimumResponseTime(startedAt);
      return GENERIC_RESPONSE;
    }

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.buildExpiryDate();
    const resetUrl = `${this.frontendUrl}/compte/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;

    const createdToken = await this.prisma.$transaction(async (transaction) => {
      await transaction.customerPasswordResetToken.updateMany({
        where: {
          customerId: customer.id,
          usedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return transaction.customerPasswordResetToken.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt,
          requestIp,
          userAgent,
        },
      });
    });

    await this.sendResetEmailSafely({
      accountType: 'customer',
      tokenId: createdToken.id,
      to: customer.email,
      recipientName: customer.fullName,
      resetUrl,
    });

    await this.ensureMinimumResponseTime(startedAt);

    return this.withDebugUrl(GENERIC_RESPONSE, resetUrl);
  }

  async resetAdminPassword(dto: ResetPasswordDto) {
    this.assertPasswordsMatch(dto);

    const tokenHash = this.hashToken(dto.token);
    const now = new Date();

    const resetToken = await this.prisma.adminPasswordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.revokedAt ||
      resetToken.expiresAt <= now ||
      !resetToken.user.isActive
    ) {
      throw new BadRequestException(
        'Ce lien de réinitialisation est invalide ou expiré.',
      );
    }

    const passwordHash = await hash(dto.newPassword, 12);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      await transaction.adminPasswordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      });

      await transaction.adminPasswordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await transaction.adminSession.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
    });

    return {
      message:
        'Mot de passe administrateur réinitialisé. Toutes les sessions ont été déconnectées.',
    };
  }

  async resetCustomerPassword(dto: ResetPasswordDto) {
    this.assertPasswordsMatch(dto);

    const tokenHash = this.hashToken(dto.token);
    const now = new Date();

    const resetToken = await this.prisma.customerPasswordResetToken.findUnique({
      where: { tokenHash },
      include: { customer: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.revokedAt ||
      resetToken.expiresAt <= now ||
      !resetToken.customer.isActive
    ) {
      throw new BadRequestException(
        'Ce lien de réinitialisation est invalide ou expiré.',
      );
    }

    const passwordHash = await hash(dto.newPassword, 12);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.customer.update({
        where: { id: resetToken.customerId },
        data: { passwordHash },
      });

      await transaction.customerPasswordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      });

      await transaction.customerPasswordResetToken.updateMany({
        where: {
          customerId: resetToken.customerId,
          id: { not: resetToken.id },
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await transaction.customerSession.updateMany({
        where: {
          customerId: resetToken.customerId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
    });

    return {
      message:
        'Mot de passe client réinitialisé. Toutes les sessions ont été déconnectées.',
    };
  }

  private async sendResetEmailSafely(input: {
    accountType: 'admin' | 'customer';
    tokenId: string;
    to: string;
    recipientName: string;
    resetUrl: string;
  }) {
    try {
      await this.mailService.sendPasswordResetEmail({
        to: input.to,
        recipientName: input.recipientName,
        resetUrl: input.resetUrl,
        expiresInMinutes: RESET_TOKEN_LIFETIME_MINUTES,
      });
    } catch (error) {
      if (!this.debugEnabled) {
        const now = new Date();

        if (input.accountType === 'admin') {
          await this.prisma.adminPasswordResetToken.updateMany({
            where: { id: input.tokenId, revokedAt: null },
            data: { revokedAt: now },
          });
        } else {
          await this.prisma.customerPasswordResetToken.updateMany({
            where: { id: input.tokenId, revokedAt: null },
            data: { revokedAt: now },
          });
        }
      }

      this.logger.error(
        `Échec d’envoi de l’email de réinitialisation ${input.accountType}.`,
        error instanceof Error ? error.stack : undefined,
      );

      if (this.debugEnabled) {
        this.logger.warn(
          'PASSWORD_RESET_DEBUG est actif : le token reste utilisable localement via debugResetUrl.',
        );
      }
    }
  }

  private async isIpRateLimited(requestIp: string | null) {
    if (!requestIp) {
      return false;
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);

    const [adminRequests, customerRequests] = await this.prisma.$transaction([
      this.prisma.adminPasswordResetToken.count({
        where: {
          requestIp,
          createdAt: { gte: since },
        },
      }),
      this.prisma.customerPasswordResetToken.count({
        where: {
          requestIp,
          createdAt: { gte: since },
        },
      }),
    ]);

    return adminRequests + customerRequests >= MAX_IP_REQUESTS_PER_HOUR;
  }

  private async isAdminAccountRateLimited(userId: string) {
    const since = new Date(Date.now() - 60 * 60 * 1000);

    const count = await this.prisma.adminPasswordResetToken.count({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });

    return count >= MAX_ACCOUNT_REQUESTS_PER_HOUR;
  }

  private async isCustomerAccountRateLimited(customerId: string) {
    const since = new Date(Date.now() - 60 * 60 * 1000);

    const count = await this.prisma.customerPasswordResetToken.count({
      where: {
        customerId,
        createdAt: { gte: since },
      },
    });

    return count >= MAX_ACCOUNT_REQUESTS_PER_HOUR;
  }

  private async cleanupOldTokens() {
    const retentionDate = new Date();
    retentionDate.setDate(
      retentionDate.getDate() - RESET_TOKEN_RETENTION_DAYS,
    );

    await this.prisma.$transaction([
      this.prisma.adminPasswordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: retentionDate } },
            { usedAt: { lte: retentionDate } },
            { revokedAt: { lte: retentionDate } },
          ],
        },
      }),
      this.prisma.customerPasswordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: retentionDate } },
            { usedAt: { lte: retentionDate } },
            { revokedAt: { lte: retentionDate } },
          ],
        },
      }),
    ]);
  }

  private assertPasswordsMatch(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'La confirmation du mot de passe ne correspond pas.',
      );
    }
  }

  private generateToken() {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildExpiryDate() {
    return new Date(Date.now() + RESET_TOKEN_LIFETIME_MINUTES * 60 * 1000);
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizeOptionalValue(value?: string) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue.slice(0, 500) : null;
  }

  private withDebugUrl<T extends object>(response: T, resetUrl: string) {
    if (!this.debugEnabled) {
      return response;
    }

    return {
      ...response,
      debugResetUrl: resetUrl,
    };
  }

  private async ensureMinimumResponseTime(startedAt: number) {
    const remainingTime = MINIMUM_RESPONSE_TIME_MS - (Date.now() - startedAt);

    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  }
}
