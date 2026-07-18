import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { GoogleIdentityService } from './services/google-identity.service';
import { CustomerEmailVerificationService } from './services/customer-email-verification.service';

@Module({
  imports: [AuthModule],
  controllers: [CustomerAuthController],
  providers: [
    CustomerAuthService,
    GoogleIdentityService,
    CustomerEmailVerificationService,
  ],
})
export class CustomerAuthModule {}
