import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSaleCampaignDto } from './dto/create-sale-campaign.dto';
import { UpdateSaleCampaignStatusDto } from './dto/update-sale-campaign-status.dto';
import { UpdateSaleCampaignDto } from './dto/update-sale-campaign.dto';
import { SaleCampaignsService } from './sale-campaigns.service';

@Controller('sale-campaigns')
export class SaleCampaignsController {
  constructor(private readonly saleCampaignsService: SaleCampaignsService) {}

  @Get()
  findPublicCampaigns() {
    return this.saleCampaignsService.findPublicCampaigns();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin')
  findAllForAdmin() {
    return this.saleCampaignsService.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() createSaleCampaignDto: CreateSaleCampaignDto) {
    return this.saleCampaignsService.create(createSaleCampaignDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.saleCampaignsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSaleCampaignDto: UpdateSaleCampaignDto,
  ) {
    return this.saleCampaignsService.update(id, updateSaleCampaignDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateSaleCampaignStatusDto: UpdateSaleCampaignStatusDto,
  ) {
    return this.saleCampaignsService.updateStatus(
      id,
      updateSaleCampaignStatusDto,
    );
  }
}
