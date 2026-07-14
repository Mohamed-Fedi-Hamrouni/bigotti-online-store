import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type VerifiedGoogleAdminIdentity = {
  subject: string;
  email: string;
  profilePicture: string | null;
  authoritativeEmail: boolean;
};

@Injectable()
export class AdminGoogleIdentityService {
  private readonly clientId: string;
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService
      .get<string>('GOOGLE_CLIENT_ID', '')
      .trim();
  }

  async verifyCredential(
    credential: string,
  ): Promise<VerifiedGoogleAdminIdentity> {
    if (
      !this.clientId ||
      this.clientId.includes('xxxxxxxx') ||
      this.clientId.includes('your-google-client-id')
    ) {
      throw new ServiceUnavailableException(
        'La connexion Google administrateur n’est pas configurée.',
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new UnauthorizedException(
          'Le compte Google ne fournit pas une adresse email vérifiée.',
        );
      }

      const email = payload.email.trim().toLowerCase();

      return {
        subject: payload.sub,
        email,
        profilePicture: payload.picture?.trim() || null,
        authoritativeEmail:
          email.endsWith('@gmail.com') || Boolean(payload.hd?.trim()),
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new UnauthorizedException(
        'La connexion Google administrateur a échoué. Veuillez réessayer.',
      );
    }
  }
}
