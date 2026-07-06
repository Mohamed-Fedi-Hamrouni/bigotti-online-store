import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAMES } from '../services/auth-cookie.service';
import { AuthSessionService } from '../services/auth-session.service';
import { JwtPayload } from '../types/jwt-payload.type';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;

type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authSessionService: AuthSessionService,
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
      !payload.sessionId ||
      payload.tokenType !== 'admin' ||
      !ADMIN_ROLES.includes(payload.role)
    ) {
      throw new UnauthorizedException('Session admin invalide.');
    }

    const session = await this.authSessionService.getActiveAdminSession(
      payload.sessionId,
    );

    const user = session.user;

    if (
      user.id !== payload.sub ||
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
      role: user.role as JwtPayload['role'],
      sessionId: session.id,
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
