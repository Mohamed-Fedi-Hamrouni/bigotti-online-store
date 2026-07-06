import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
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

@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.customerAuthService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginCustomerDto, @Req() request: RequestLike) {
    return this.customerAuthService.login(dto, getClientIp(request));
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.customerAuthService.me(authorization);
  }

  @Patch('profile')
  updateProfile(
    @Body() dto: UpdateCustomerProfileDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.updateProfile(dto, authorization);
  }

  @Patch('password')
  changePassword(
    @Body() dto: ChangeCustomerPasswordDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.customerAuthService.changePassword(dto, authorization);
  }

  @Get('orders')
  orders(@Headers('authorization') authorization?: string) {
    return this.customerAuthService.getCustomerOrders(authorization);
  }
}
