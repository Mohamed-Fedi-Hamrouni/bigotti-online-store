import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { ObservabilityModule } from './observability.module';
import type { RequestContext } from './request-context.types';
import { RequestIdMiddleware } from './request-id.middleware';

@Controller()
class ObservabilityTestController {
  @Get('success')
  success(): { ok: true } {
    return { ok: true };
  }

  @Post('safe-input')
  safeInput(): { ok: true } {
    return { ok: true };
  }

  @Get('authenticated')
  authenticated(@Req() req: RequestContext): { ok: true } {
    req.user = {
      sub: 'internal-user-42',
      role: 'ADMIN',
    };
    return { ok: true };
  }

  @Get('health/live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('health/ready')
  ready(@Req() req: Request): { status: string } {
    if (req.query.fail === 'true') {
      throw new ServiceUnavailableException('Service indisponible.');
    }
    return { status: 'ok' };
  }

  @Get('known-error')
  knownError(): never {
    throw new BadRequestException({
      statusCode: 400,
      message: ['name must be a string'],
      error: 'Bad Request',
    });
  }

  @Get('unknown-error')
  unknownError(): never {
    throw new Error('postgresql://user:password@private-host/database');
  }
}

@Module({
  imports: [ObservabilityModule],
  controllers: [ObservabilityTestController],
})
class ObservabilityTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

describe('HTTP observability', () => {
  let app: INestApplication;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(async () => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    const module = await Test.createTestingModule({
      imports: [ObservabilityTestModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  function requestLogs(): Array<Record<string, unknown>> {
    return logSpy.mock.calls
      .map(([entry]) => String(entry))
      .filter((entry) => entry.startsWith('{'))
      .map((entry) => JSON.parse(entry) as Record<string, unknown>)
      .filter((entry) => entry.event === 'http_request');
  }

  function errorLogs(): Array<Record<string, unknown>> {
    return errorSpy.mock.calls
      .map(([entry]) => String(entry))
      .filter((entry) => entry.startsWith('{'))
      .map((entry) => JSON.parse(entry) as Record<string, unknown>)
      .filter((entry) => entry.event === 'http_error');
  }

  it('generates a UUID when x-request-id is absent and returns it', async () => {
    const response = await request(app.getHttpServer())
      .get('/success')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('preserves a valid incoming request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/success')
      .set('x-request-id', 'client.Request_123-safe')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('client.Request_123-safe');
    expect(requestLogs()[0].requestId).toBe('client.Request_123-safe');
  });

  it.each(['invalid request id!', 'a'.repeat(129)])(
    'replaces an invalid incoming request ID',
    async (incoming) => {
      const response = await request(app.getHttpServer())
        .get('/success')
        .set('x-request-id', incoming)
        .expect(200);

      expect(response.headers['x-request-id']).not.toBe(incoming);
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    },
  );

  it('writes the safe successful request log shape', async () => {
    await request(app.getHttpServer())
      .get('/success?resetToken=top-secret')
      .set('authorization', 'Bearer access-secret')
      .set('cookie', 'refreshToken=cookie-secret')
      .expect(200);

    const entry = requestLogs()[0];
    expect(entry).toMatchObject({
      event: 'http_request',
      method: 'GET',
      path: '/success',
      statusCode: 200,
    });
    expect(entry.requestId).toEqual(expect.any(String));
    expect(entry.durationMs).toEqual(expect.any(Number));
    expect(entry.timestamp).toEqual(expect.any(String));
    expect(Number.isInteger(entry.durationMs)).toBe(true);
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(entry).toLowerCase()).not.toMatch(
      /authorization|cookie|access-secret|cookie-secret|top-secret|resettoken/,
    );
  });

  it('does not log body fields or values', async () => {
    await request(app.getHttpServer())
      .post('/safe-input')
      .send({ password: 'body-secret', name: 'Private Name' })
      .expect(201);

    expect(JSON.stringify(requestLogs()).toLowerCase()).not.toMatch(
      /password|body-secret|private name/,
    );
  });

  it('suppresses successful health logs but logs failed health checks', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(requestLogs()).toHaveLength(0);

    await request(app.getHttpServer())
      .get('/health/ready?fail=true')
      .expect(503);
    expect(errorLogs()[0]).toMatchObject({
      event: 'http_error',
      path: '/health/ready',
      statusCode: 503,
    });
  });

  it('preserves known HttpException status and safe validation messages', async () => {
    const response = await request(app.getHttpServer())
      .get('/known-error')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      message: ['name must be a string'],
      error: 'Bad Request',
      path: '/known-error',
      requestId: response.headers['x-request-id'],
    });
  });

  it('sanitizes unknown exceptions and correlates the response and error log', async () => {
    const response = await request(app.getHttpServer())
      .get('/unknown-error')
      .expect(500);

    expect(response.body).toMatchObject({
      statusCode: 500,
      message: 'Une erreur interne est survenue.',
      path: '/unknown-error',
      requestId: response.headers['x-request-id'],
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toMatch(
      /postgresql|private-host|password|stack/i,
    );
    expect(errorLogs()[0]).toMatchObject({
      requestId: response.headers['x-request-id'],
      method: 'GET',
      path: '/unknown-error',
      statusCode: 500,
      errorType: 'InternalServerError',
    });
  });

  it('includes only authenticated ID and role from the principal', async () => {
    await request(app.getHttpServer()).get('/authenticated').expect(200);

    expect(requestLogs()[0]).toMatchObject({
      userId: 'internal-user-42',
      role: 'ADMIN',
    });
    expect(JSON.stringify(requestLogs()[0])).not.toMatch(/email|name|phone/i);
  });
});
