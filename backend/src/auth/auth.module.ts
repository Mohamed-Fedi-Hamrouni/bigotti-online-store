import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AdminGoogleIdentityService } from './services/admin-google-identity.service';
import { AuthCookieService } from './services/auth-cookie.service';
import { AuthSessionService } from './services/auth-session.service';
import { LoginAttemptsService } from './services/login-attempts.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    LoginAttemptsService,
    AuthCookieService,
    AuthSessionService,
    AdminGoogleIdentityService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    LoginAttemptsService,
    AuthCookieService,
    AuthSessionService,
    JwtModule,
  ],
})
export class AuthModule {}
