import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { CollectionsModule } from './collections/collections.module';
import { validateEnvironment } from './config/environment';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { OrdersModule } from './orders/orders.module';
import { ObservabilityModule } from './observability/observability.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { SaleCampaignsModule } from './sale-campaigns/sale-campaigns.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'global',
          ttl: configService.get<number>('GLOBAL_RATE_LIMIT_TTL_MS', 60_000),
          limit: configService.get<number>('GLOBAL_RATE_LIMIT_MAX', 120),
        },
      ],
    }),
    PrismaModule,
    ObservabilityModule,
    HealthModule,
    MailModule,
    PasswordResetModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    CollectionsModule,
    SaleCampaignsModule,
    ProductsModule,
    OrdersModule,
    DashboardModule,
    UploadsModule,
    CustomerAuthModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
