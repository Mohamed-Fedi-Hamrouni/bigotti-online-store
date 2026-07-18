import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
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
import { GoogleCredentialDto } from './dto/google-credential.dto';
import { GoogleRegisterCustomerDto } from './dto/google-register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { VerifyCustomerEmailDto } from './dto/verify-customer-email.dto';
import { ResendCustomerVerificationDto } from './dto/resend-customer-verification.dto';
import { CustomerEmailVerificationService } from './services/customer-email-verification.service';

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string;
  };
  cookies?: Record<string, string | undefined>;
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
    private readonly emailVerificationService: CustomerEmailVerificationService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterCustomerDto,
    @Req() request: RequestLike,
  ) {
    return this.customerAuthService.register(dto, getRequestContext(request));
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyCustomerEmailDto) {
    return this.emailVerificationService.verify(dto);
  }

  @Post('resend-verification')
  resendVerification(
    @Body() dto: ResendCustomerVerificationDto,
    @Req() request: RequestLike,
  ) {
    return this.emailVerificationService.resend(
      dto,
      getRequestContext(request),
    );
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

    this.setCustomerCookies(response, result);

    return {
      customer: result.customer,
    };
  }

  @Post('google/login')
  async googleLogin(
    @Body() dto: GoogleCredentialDto,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.loginWithGoogle(
      dto,
      getRequestContext(request),
    );

    this.setCustomerCookies(response, result);

    return {
      customer: result.customer,
    };
  }

  @Post('google/register')
  async googleRegister(
    @Body() dto: GoogleRegisterCustomerDto,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.registerWithGoogle(
      dto,
      getRequestContext(request),
    );

    this.setCustomerCookies(response, result);

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

    this.setCustomerCookies(response, result);

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

  @Get('sessions')
  sessions(
    @Req() request: RequestLike,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.listSessions(
      getCustomerAuthorization(this.authCookieService, request, authorization),
    );
  }

  @Delete('sessions/:sessionId')
  async revokeSession(
    @Req() request: RequestLike,
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.revokeSession(
      sessionId,
      getCustomerAuthorization(this.authCookieService, request, authorization),
    );

    if (result.currentSessionRevoked) {
      this.authCookieService.clearCustomerAuthCookies(response);
    }

    return result;
  }

  @Post('sessions/revoke-others')
  revokeOtherSessions(
    @Req() request: RequestLike,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.revokeOtherSessions(
      getCustomerAuthorization(this.authCookieService, request, authorization),
    );
  }

  @Post('sessions/revoke-all')
  async revokeAllSessions(
    @Req() request: RequestLike,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customerAuthService.revokeAllSessions(
      getCustomerAuthorization(this.authCookieService, request, authorization),
    );

    this.authCookieService.clearCustomerAuthCookies(response);

    return result;
  }

  private setCustomerCookies(
    response: Response,
    result: {
      accessToken: string;
      refreshToken: string;
    },
  ) {
    this.authCookieService.setCustomerAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
    );
  }
}
