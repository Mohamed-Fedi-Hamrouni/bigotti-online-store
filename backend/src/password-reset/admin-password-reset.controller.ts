import { Body, Controller, Post, Req } from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  PasswordResetRequestContext,
  PasswordResetService,
} from './password-reset.service';

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

function getRequestContext(request: RequestLike): PasswordResetRequestContext {
  const forwardedFor = request.headers['x-forwarded-for'];
  const userAgent = request.headers['user-agent'];

  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]?.split(',')[0]?.trim()
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : request.ip || request.socket?.remoteAddress;

  return {
    ipAddress,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
  };
}

@Controller('auth')
export class AdminPasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: RequestLike) {
    return this.passwordResetService.requestAdminReset(
      dto,
      getRequestContext(request),
    );
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetAdminPassword(dto);
  }
}
