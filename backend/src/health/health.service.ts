import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SERVICE_NAME = 'bigotti-backend';
const DATABASE_CHECK_TIMEOUT_MS = 2_000;

export interface LiveHealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

export interface ReadyHealthResponse {
  status: 'ready';
  service: string;
  checks: {
    database: 'up';
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness(): LiveHealthResponse {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadyHealthResponse> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        this.prisma.$queryRawUnsafe('SELECT 1'),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Database health check timed out')),
            DATABASE_CHECK_TIMEOUT_MS,
          );
        }),
      ]);

      return {
        status: 'ready',
        service: SERVICE_NAME,
        checks: { database: 'up' },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        service: SERVICE_NAME,
        checks: { database: 'down' },
        timestamp: new Date().toISOString(),
      });
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
