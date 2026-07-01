import { IsBoolean } from 'class-validator';

export class UpdateSaleCampaignStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
