import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { CollectionsModule } from './collections/collections.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MailModule } from './mail/mail.module';
import { OrdersModule } from './orders/orders.module';
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
    }),
    PrismaModule,
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
  providers: [AppService],
})
export class AppModule {}
