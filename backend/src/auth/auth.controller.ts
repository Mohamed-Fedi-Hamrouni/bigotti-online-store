import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
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

    this.authCookieService.setAdminAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
    );

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

    this.authCookieService.setAdminAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
    );

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
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }
}
