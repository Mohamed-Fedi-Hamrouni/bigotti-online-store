import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

export type VerifiedGoogleIdentity = {
  subject: string;
  email: string;
  fullName: string;
  profilePicture: string | null;
};

@Injectable()
export class GoogleIdentityService {
  private readonly clientId: string;
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService
      .get<string>("GOOGLE_CLIENT_ID", "")
      .trim();
  }

  async verifyCredential(credential: string): Promise<VerifiedGoogleIdentity> {
    if (
      !this.clientId ||
      this.clientId.includes("xxxxxxxx") ||
      this.clientId.includes("your-google-client-id")
    ) {
      throw new ServiceUnavailableException(
        "La connexion Google n’est pas configurée.",
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
          "Le compte Google ne fournit pas une adresse email vérifiée.",
        );
      }

      const email = payload.email.trim().toLowerCase();
      const rawFullName =
        payload.name?.trim() ||
        [payload.given_name, payload.family_name]
          .filter(Boolean)
          .join(" ")
          .trim();

      const fullName =
        rawFullName.length >= 2
          ? rawFullName.replace(/\s+/g, " ")
          : "Client Bigotti";

      return {
        subject: payload.sub,
        email,
        fullName,
        profilePicture: payload.picture?.trim() || null,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new UnauthorizedException(
        "La connexion Google a échoué. Veuillez réessayer.",
      );
    }
  }
}
