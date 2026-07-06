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
import {
  AuthCookieService,
  AUTH_COOKIE_NAMES,
} from '../auth/services/auth-cookie.service';
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

function getCookieValue(request: RequestLike, cookieName: string) {
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

function getCustomerAuthorization(
  request: RequestLike,
  authorization?: string,
) {
  if (authorization) {
    return authorization;
  }

  const cookieToken = getCookieValue(request, AUTH_COOKIE_NAMES.customer);

  if (!cookieToken) {
    return undefined;
  }

  return `Bearer ${cookieToken}`;
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
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.register(dto);

    this.authCookieService.setCustomerAccessToken(response, result.accessToken);

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
      getClientIp(request),
    );

    this.authCookieService.setCustomerAccessToken(response, result.accessToken);

    return {
      customer: result.customer,
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    this.authCookieService.clearCustomerAccessToken(response);

    return {
      message: 'Déconnexion client effectuée.',
    };
  }

  @Get('me')
  me(
    @Req() request: RequestLike,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.me(
      getCustomerAuthorization(request, authorization),
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
      getCustomerAuthorization(request, authorization),
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
      getCustomerAuthorization(request, authorization),
    );
  }

  @Get('orders')
  orders(
    @Req() request: RequestLike,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.getCustomerOrders(
      getCustomerAuthorization(request, authorization),
    );
  }
}
