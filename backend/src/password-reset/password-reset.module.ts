import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminPasswordResetController } from './admin-password-reset.controller';
import { CustomerPasswordResetController } from './customer-password-reset.controller';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [
    AdminPasswordResetController,
    CustomerPasswordResetController,
  ],
  providers: [PasswordResetService],
})
export class PasswordResetModule {}
