import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_COOKIE_NAMES } from '../services/auth-cookie.service';
import { JwtPayload } from '../types/jwt-payload.type';

type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtPayload;
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Session admin manquante.');
    }

    const payload = await this.verifyToken(token);

    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      payload.tokenType !== 'admin' ||
      !ADMIN_ROLES.includes(payload.role)
    ) {
      throw new UnauthorizedException('Session admin invalide.');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Compte administrateur désactivé ou introuvable.',
      );
    }

    if (
      user.email.toLowerCase() !== payload.email.toLowerCase() ||
      user.role !== payload.role
    ) {
      throw new UnauthorizedException(
        'Session admin expirée. Veuillez vous reconnecter.',
      );
    }

    request.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'admin',
      iat: payload.iat,
      exp: payload.exp,
    };

    return true;
  }

  private async verifyToken(token: string) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new UnauthorizedException('Configuration JWT manquante.');
    }

    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Session admin invalide ou expirée.');
    }
  }

  private extractToken(request: RequestWithUser): string | undefined {
    return (
      this.extractCookieToken(request, AUTH_COOKIE_NAMES.admin) ??
      this.extractBearerToken(request)
    );
  }

  private extractBearerToken(request: RequestWithUser): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization || Array.isArray(authorization)) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private extractCookieToken(
    request: RequestWithUser,
    cookieName: string,
  ): string | undefined {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader || Array.isArray(cookieHeader)) {
      return undefined;
    }

    const cookies = cookieHeader.split(';');

    for (const cookie of cookies) {
      const [rawName, ...rawValueParts] = cookie.trim().split('=');

      if (rawName === cookieName) {
        return decodeURIComponent(rawValueParts.join('='));
      }
    }

    return undefined;
  }
}
