import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthCookieService } from '../auth/services/auth-cookie.service';
import type { AuthRequestContext } from '../auth/services/auth-session.service';
import { CustomerAuthService } from './customer-auth.service';
import { ChangeCustomerPasswordDto } from './dto/change-customer-password.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

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

function getCustomerAuthorization(
  authCookieService: AuthCookieService,
  request: RequestLike,
  authorization?: string,
) {
  const cookieToken = authCookieService.getCustomerAccessToken(request);

  if (cookieToken) {
    return `Bearer ${cookieToken}`;
  }

  return authorization;
}

@Controller('customer-auth')
export class CustomerAuthController {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterCustomerDto,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.register(
      dto,
      getRequestContext(request),
    );

    this.authCookieService.setCustomerAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
    );

    return {
      customer: result.customer,
    };
  }

  @Post('login')
  async login(
    @Body() dto: LoginCustomerDto,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.login(
      dto,
      getRequestContext(request),
    );

    this.authCookieService.setCustomerAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
    );

    return {
      customer: result.customer,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.refresh(
      this.authCookieService.getCustomerRefreshToken(request),
      getRequestContext(request),
    );

    this.authCookieService.setCustomerAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
    );

    return {
      customer: result.customer,
    };
  }

  @Post('logout')
  async logout(
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.logout(
      this.authCookieService.getCustomerRefreshToken(request),
    );

    this.authCookieService.clearCustomerAuthCookies(response);

    return result;
  }

  @Get('me')
  me(
    @Req() request: RequestLike,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.me(
      getCustomerAuthorization(this.authCookieService, request, authorization),
    );
  }

  @Patch('profile')
  updateProfile(
    @Req() request: RequestLike,
    @Body() dto: UpdateCustomerProfileDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.updateProfile(
      dto,
      getCustomerAuthorization(this.authCookieService, request, authorization),
    );
  }

  @Patch('password')
  changePassword(
    @Req() request: RequestLike,
    @Body() dto: ChangeCustomerPasswordDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.changePassword(
      dto,
      getCustomerAuthorization(this.authCookieService, request, authorization),
    );
  }

  @Get('orders')
  orders(
    @Req() request: RequestLike,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.getCustomerOrders(
      getCustomerAuthorization(this.authCookieService, request, authorization),
    );
  }
}
