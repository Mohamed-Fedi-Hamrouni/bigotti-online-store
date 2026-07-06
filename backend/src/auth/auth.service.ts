import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
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

    const { session, refreshToken } =
      await this.authSessionService.createAdminSession(user.id, context);

    const accessToken = await this.signAdminAccessToken(user, session.id);

    return {
      accessToken,
      refreshToken,
      user: this.toSafeUser(user),
    };
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
