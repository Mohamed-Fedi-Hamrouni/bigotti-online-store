import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAdminCredentialDto } from './dto/google-admin-credential.dto';
import { LoginDto } from './dto/login.dto';
import { AdminGoogleIdentityService } from './services/admin-google-identity.service';
import {
  AuthRequestContext,
  AuthSessionService,
} from './services/auth-session.service';
import { LoginAttemptsService } from './services/login-attempts.service';
import type { AdminRole, JwtPayload } from './types/jwt-payload.type';

const ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly authSessionService: AuthSessionService,
    private readonly adminGoogleIdentityService: AdminGoogleIdentityService,
  ) {}

  async login(loginDto: LoginDto, context: AuthRequestContext = {}) {
    const email = loginDto.email.toLowerCase().trim();
    const clientIp = context.ipAddress ?? 'unknown';

    this.loginAttempts.assertCanAttempt('admin', email, clientIp);

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || !user.isActive) {
      this.loginAttempts.recordFailure('admin', email, clientIp);
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    if (!ADMIN_ROLES.includes(user.role as AdminRole)) {
      this.loginAttempts.recordFailure('admin', email, clientIp);
      throw new UnauthorizedException('Compte administrateur non autorisé.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.loginAttempts.recordFailure('admin', email, clientIp);
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    this.loginAttempts.reset('admin', email, clientIp);

    return this.createAdminSessionResult(user, context);
  }

  async loginWithGoogle(
    dto: GoogleAdminCredentialDto,
    context: AuthRequestContext = {},
  ) {
    const googleIdentity =
      await this.adminGoogleIdentityService.verifyCredential(dto.credential);

    const existingIdentity = await this.prisma.adminIdentity.findFirst({
      where: {
        provider: 'GOOGLE',
        providerSubject: googleIdentity.subject,
      },
      include: {
        user: true,
      },
    });

    if (existingIdentity) {
      this.assertAuthorizedAdmin(existingIdentity.user);

      if (existingIdentity.user.email.toLowerCase() !== googleIdentity.email) {
        throw new UnauthorizedException(
          'Ce compte Google ne correspond plus au compte administrateur lié.',
        );
      }

      await this.prisma.adminIdentity.update({
        where: {
          id: existingIdentity.id,
        },
        data: {
          providerEmail: googleIdentity.email,
          emailVerified: true,
          profilePicture: googleIdentity.profilePicture,
        },
      });

      return this.createAdminSessionResult(existingIdentity.user, context);
    }

    if (!googleIdentity.authoritativeEmail) {
      throw new UnauthorizedException(
        'Pour une première liaison administrateur, utilisez une adresse Gmail ou Google Workspace vérifiée.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: googleIdentity.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Ce compte Google n’est pas autorisé à accéder à l’administration.',
      );
    }

    this.assertAuthorizedAdmin(user);

    const identityAlreadyLinkedToUser =
      await this.prisma.adminIdentity.findFirst({
        where: {
          userId: user.id,
          provider: 'GOOGLE',
        },
      });

    if (identityAlreadyLinkedToUser) {
      throw new UnauthorizedException(
        'Ce compte administrateur est déjà lié à un autre compte Google.',
      );
    }

    try {
      await this.prisma.adminIdentity.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerSubject: googleIdentity.subject,
          providerEmail: googleIdentity.email,
          emailVerified: true,
          profilePicture: googleIdentity.profilePicture,
        },
      });
    } catch {
      throw new ConflictException(
        'La liaison Google administrateur n’a pas pu être créée. Veuillez réessayer.',
      );
    }

    return this.createAdminSessionResult(user, context);
  }

  async refresh(refreshToken: string | undefined, context: AuthRequestContext) {
    if (!refreshToken) {
      throw new UnauthorizedException('Session administrateur expirée.');
    }

    const result = await this.authSessionService.rotateAdminSession(
      refreshToken,
      context,
    );

    return {
      accessToken: await this.signAdminAccessToken(
        result.user,
        result.session.id,
      ),
      refreshToken: result.refreshToken,
      user: this.toSafeUser(result.user),
    };
  }

  async logout(refreshToken?: string) {
    await this.authSessionService.revokeAdminSession(refreshToken);

    return {
      message: 'Déconnexion administrateur effectuée.',
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Compte administrateur désactivé ou introuvable.',
      );
    }

    return this.toSafeUser(user);
  }

  async listSessions(userId: string, currentSessionId: string) {
    return this.authSessionService.listAdminSessions(
      userId,
      currentSessionId,
    );
  }

  async revokeSession(
    userId: string,
    currentSessionId: string,
    sessionId: string,
  ) {
    await this.authSessionService.revokeAdminSessionById(userId, sessionId);

    return {
      message:
        sessionId === currentSessionId
          ? 'Session administrateur actuelle révoquée.'
          : 'Session administrateur révoquée.',
      currentSessionRevoked: sessionId === currentSessionId,
    };
  }

  async revokeOtherSessions(userId: string, currentSessionId: string) {
    const revokedSessions =
      await this.authSessionService.revokeOtherAdminSessions(
        userId,
        currentSessionId,
      );

    return {
      message: 'Les autres sessions administrateur ont été révoquées.',
      revokedSessions,
    };
  }

  async revokeAllSessions(userId: string) {
    const revokedSessions =
      await this.authSessionService.revokeAllAdminSessions(userId);

    return {
      message: 'Toutes les sessions administrateur ont été révoquées.',
      revokedSessions,
    };
  }

  private assertAuthorizedAdmin(user: {
    isActive: boolean;
    role: string;
  }) {
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Compte administrateur désactivé ou non autorisé.',
      );
    }

    if (!ADMIN_ROLES.includes(user.role as AdminRole)) {
      throw new UnauthorizedException('Compte administrateur non autorisé.');
    }
  }

  private async createAdminSessionResult(
    user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    context: AuthRequestContext,
  ) {
    const { session, refreshToken } =
      await this.authSessionService.createAdminSession(user.id, context);

    return {
      accessToken: await this.signAdminAccessToken(user, session.id),
      refreshToken,
      user: this.toSafeUser(user),
    };
  }

  private async signAdminAccessToken(
    user: {
      id: string;
      email: string;
      role: string;
    },
    sessionId: string,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as AdminRole,
      sessionId,
      tokenType: 'admin',
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
  }

  private toSafeUser(user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role as AdminRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
