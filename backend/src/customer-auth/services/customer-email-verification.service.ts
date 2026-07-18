import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResendCustomerVerificationDto } from '../dto/resend-customer-verification.dto';
import { VerifyCustomerEmailDto } from '../dto/verify-customer-email.dto';

export type EmailVerificationRequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

const TOKEN_LIFETIME_HOURS = 24;
const MINIMUM_RESPONSE_TIME_MS = 350;
const MAX_ACCOUNT_REQUESTS_PER_HOUR = 3;
const MAX_IP_REQUESTS_PER_HOUR = 20;
const GENERIC_RESPONSE = {
  message:
    'Si un compte non vérifié correspond à cette adresse, un email de vérification a été envoyé.',
};

@Injectable()
export class CustomerEmailVerificationService {
  private readonly logger = new Logger(CustomerEmailVerificationService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    configService: ConfigService,
  ) {
    const explicitUrl = configService
      .get<string>('PUBLIC_FRONTEND_URL')
      ?.trim();
    const configuredUrl = configService
      .get<string>('FRONTEND_URL')
      ?.split(',')[0]
      ?.trim();
    this.frontendUrl = (
      explicitUrl ||
      configuredUrl ||
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  async sendForCustomer(
    customer: { id: string; email: string | null; fullName: string },
    context: EmailVerificationRequestContext = {},
  ) {
    if (!customer.email) {
      throw new BadRequestException('Adresse email client manquante.');
    }

    const rawToken = randomBytes(48).toString('base64url');
    const now = new Date();
    const created = await this.prisma.$transaction(async (transaction) => {
      await transaction.customerEmailVerificationToken.updateMany({
        where: { customerId: customer.id, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      return transaction.customerEmailVerificationToken.create({
        data: {
          customerId: customer.id,
          tokenHash: this.hashToken(rawToken),
          expiresAt: new Date(
            now.getTime() + TOKEN_LIFETIME_HOURS * 60 * 60 * 1000,
          ),
          requestIp: this.normalizeOptional(context.ipAddress),
          userAgent: this.normalizeOptional(context.userAgent),
        },
      });
    });

    const verificationUrl = `${this.frontendUrl}/compte/verifier-email?token=${encodeURIComponent(rawToken)}`;
    try {
      await this.mailService.sendEmailVerification({
        to: customer.email,
        recipientName: customer.fullName,
        verificationUrl,
        expiresInHours: TOKEN_LIFETIME_HOURS,
      });
    } catch (error) {
      await this.prisma.customerEmailVerificationToken.updateMany({
        where: { id: created.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw error;
    }
  }

  async verify(dto: VerifyCustomerEmailDto) {
    const now = new Date();
    const verificationToken =
      await this.prisma.customerEmailVerificationToken.findUnique({
        where: { tokenHash: this.hashToken(dto.token) },
        include: { customer: true },
      });

    if (!verificationToken || !verificationToken.customer.isActive) {
      throw new BadRequestException(
        'Ce lien de vérification est invalide.',
      );
    }
    if (verificationToken.usedAt) {
      throw new BadRequestException(
        'Ce lien de vérification a déjà été utilisé.',
      );
    }
    if (verificationToken.revokedAt) {
      throw new BadRequestException(
        'Ce lien de vérification a été remplacé par un lien plus récent.',
      );
    }
    if (verificationToken.expiresAt <= now) {
      throw new BadRequestException('Ce lien de vérification a expiré.');
    }

    await this.prisma.$transaction(async (transaction) => {
      const claimed =
        await transaction.customerEmailVerificationToken.updateMany({
          where: {
            id: verificationToken.id,
            usedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { usedAt: now },
        });
      if (claimed.count !== 1) {
        throw new BadRequestException(
          'Ce lien de vérification est invalide, expiré ou déjà utilisé.',
        );
      }
      await transaction.customer.update({
        where: { id: verificationToken.customerId },
        data: { emailVerifiedAt: now },
      });
      await transaction.customerEmailVerificationToken.updateMany({
        where: {
          customerId: verificationToken.customerId,
          id: { not: verificationToken.id },
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
    });

    return { message: 'Votre adresse email a été vérifiée avec succès.' };
  }

  async resend(
    dto: ResendCustomerVerificationDto,
    context: EmailVerificationRequestContext = {},
  ) {
    const startedAt = Date.now();
    const email = dto.email.trim().toLowerCase();
    const requestIp = this.normalizeOptional(context.ipAddress);
    const since = new Date(Date.now() - 60 * 60 * 1000);

    const ipLimited = requestIp
      ? (await this.prisma.customerEmailVerificationToken.count({
          where: { requestIp, createdAt: { gte: since } },
        })) >= MAX_IP_REQUESTS_PER_HOUR
      : false;
    const customer = await this.prisma.customer.findFirst({
      where: {
        email,
        isActive: true,
        passwordHash: { not: null },
        emailVerifiedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!ipLimited && customer) {
      const count = await this.prisma.customerEmailVerificationToken.count({
        where: { customerId: customer.id, createdAt: { gte: since } },
      });
      if (count < MAX_ACCOUNT_REQUESTS_PER_HOUR) {
        try {
          await this.sendForCustomer(customer, context);
        } catch (error) {
          this.logger.error(
            'Échec d’envoi de la vérification client.',
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }

    await this.ensureMinimumResponseTime(startedAt);
    return GENERIC_RESPONSE;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizeOptional(value?: string) {
    const normalized = value?.trim();
    return normalized ? normalized.slice(0, 500) : null;
  }

  private async ensureMinimumResponseTime(startedAt: number) {
    const remaining = MINIMUM_RESPONSE_TIME_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }
}
