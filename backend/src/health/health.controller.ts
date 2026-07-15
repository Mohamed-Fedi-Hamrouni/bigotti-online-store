import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { LiveHealthResponse, ReadyHealthResponse } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  getLiveness(): LiveHealthResponse {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  getReadiness(): Promise<ReadyHealthResponse> {
    return this.healthService.getReadiness();
  }
}
