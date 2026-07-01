import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SaleCampaignsController } from './sale-campaigns.controller';
import { SaleCampaignsService } from './sale-campaigns.service';

@Module({
  imports: [AuthModule],
  controllers: [SaleCampaignsController],
  providers: [SaleCampaignsService],
  exports: [SaleCampaignsService],
})
export class SaleCampaignsModule {}
