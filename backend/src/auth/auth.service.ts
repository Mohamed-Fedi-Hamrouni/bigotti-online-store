import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginAttemptsService } from './services/login-attempts.service';
import type { AdminRole, JwtPayload } from './types/jwt-payload.type';

const ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  async login(loginDto: LoginDto, clientIp = 'unknown') {
    const email = loginDto.email.toLowerCase().trim();

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

    if (!ADMIN_ROLES.includes(user.role)) {
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

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'admin',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.toSafeUser(user),
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

  private toSafeUser(user: {
    id: string;
    fullName: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
