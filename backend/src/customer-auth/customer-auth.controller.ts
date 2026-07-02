import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.customerAuthService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginCustomerDto) {
    return this.customerAuthService.login(dto);
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

  @Get('orders')
  orders(@Headers('authorization') authorization?: string) {
    return this.customerAuthService.getCustomerOrders(authorization);
  }
}
