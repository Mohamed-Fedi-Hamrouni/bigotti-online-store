import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleAdminCredentialDto } from './dto/google-admin-credential.dto';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthCookieService } from './services/auth-cookie.service';
import type { AuthRequestContext } from './services/auth-session.service';
import type { JwtPayload } from './types/jwt-payload.type';

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string;
  };
};

function getClientIp(request: RequestLike) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(',')[0]?.trim() || 'unknown';
  }

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.ip || request.socket?.remoteAddress || 'unknown';
}

function getRequestContext(request: RequestLike): AuthRequestContext {
  const userAgent = request.headers['user-agent'];

  return {
    ipAddress: getClientIp(request),
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      loginDto,
      getRequestContext(request),
    );

    this.setAdminCookies(response, result);

    return {
      user: result.user,
    };
  }

  @Post('google/login')
  async googleLogin(
    @Body() dto: GoogleAdminCredentialDto,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.loginWithGoogle(
      dto,
      getRequestContext(request),
    );

    this.setAdminCookies(response, result);

    return {
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(
      this.authCookieService.getAdminRefreshToken(request),
      getRequestContext(request),
    );

    this.setAdminCookies(response, result);

    return {
      user: result.user,
    };
  }

  @Post('logout')
  async logout(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(
      this.authCookieService.getAdminRefreshToken(request),
    );

    this.authCookieService.clearAdminAuthCookies(response);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangeAdminPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(user.sub, dto);
    this.authCookieService.clearAdminAuthCookies(response);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAdminProfileDto,
  ) {
    return this.authService.updateProfile(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@CurrentUser() user: JwtPayload) {
    return this.authService.listSessions(user.sub, user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.revokeSession(
      user.sub,
      user.sessionId,
      sessionId,
    );

    if (result.currentSessionRevoked) {
      this.authCookieService.clearAdminAuthCookies(response);
    }

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke-others')
  revokeOtherSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.revokeOtherSessions(user.sub, user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke-all')
  async revokeAllSessions(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.revokeAllSessions(user.sub);

    this.authCookieService.clearAdminAuthCookies(response);

    return result;
  }

  private setAdminCookies(
    response: Response,
    result: {
      accessToken: string;
      refreshToken: string;
    },
  ) {
    this.authCookieService.setAdminAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
    );
  }
}
