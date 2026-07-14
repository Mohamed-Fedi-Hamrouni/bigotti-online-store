import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  buildPasswordResetTemplate,
  PasswordResetTemplateInput,
} from './templates/password-reset.template';

export type SendPasswordResetEmailInput = Omit<
  PasswordResetTemplateInput,
  'appName' | 'supportEmail'
> & {
  to: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string | null;
  private readonly appName: string;
  private readonly supportEmail?: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    this.from = this.configService.get<string>('MAIL_FROM')?.trim() || null;
    this.appName =
      this.configService.get<string>('APP_NAME')?.trim() ||
      'Bigotti Collection';
    this.supportEmail =
      this.configService.get<string>('MAIL_SUPPORT_EMAIL')?.trim() || undefined;

    this.resend = apiKey ? new Resend(apiKey) : null;

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    if (!this.resend || !this.from) {
      const message =
        'Configuration email incomplète : RESEND_API_KEY et MAIL_FROM sont obligatoires.';

      if (isProduction) {
        throw new Error(message);
      }

      this.logger.warn(`${message} Aucun email ne pourra être envoyé.`);
    }
  }

  isConfigured() {
    return Boolean(this.resend && this.from);
  }

  async sendPasswordResetEmail(input: SendPasswordResetEmailInput) {
    const template = buildPasswordResetTemplate({
      appName: this.appName,
      recipientName: input.recipientName,
      resetUrl: input.resetUrl,
      expiresInMinutes: input.expiresInMinutes,
      supportEmail: this.supportEmail,
    });

    return this.send({
      to: input.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private async send(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    if (!this.resend || !this.from) {
      throw new ServiceUnavailableException(
        'Le service email est temporairement indisponible.',
      );
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      if (error) {
        this.logger.error(
          `Échec d’envoi Resend : ${error.name ?? 'Erreur inconnue'}`,
        );

        throw new ServiceUnavailableException(
          'Le service email est temporairement indisponible.',
        );
      }

      return {
        id: data?.id ?? null,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        'Échec inattendu lors de l’envoi de l’email transactionnel.',
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException(
        'Le service email est temporairement indisponible.',
      );
    }
  }
}
