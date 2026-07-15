import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('Health endpoints', () => {
  let controller: HealthController;
  let queryDatabase: jest.Mock;

  beforeEach(async () => {
    queryDatabase = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: { $queryRawUnsafe: queryDatabase },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a safe healthy liveness response without querying PostgreSQL', () => {
    const response = controller.getLiveness();

    expect(response).toEqual({
      status: 'ok',
      service: 'bigotti-backend',
      timestamp: expect.any(String),
    });
    expect(queryDatabase).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toMatch(
      /DATABASE_URL|postgres(?:ql)?:\/\/|connection/i,
    );
  });

  it('returns ready when Prisma responds', async () => {
    queryDatabase.mockResolvedValue([{ '?column?': 1 }]);

    const response = await controller.getReadiness();

    expect(queryDatabase).toHaveBeenCalledWith('SELECT 1');
    expect(response).toEqual({
      status: 'ready',
      service: 'bigotti-backend',
      checks: { database: 'up' },
      timestamp: expect.any(String),
    });
    expect(JSON.stringify(response)).not.toMatch(
      /DATABASE_URL|postgres(?:ql)?:\/\/|connection/i,
    );
  });

  it('returns a sanitized 503 when Prisma fails', async () => {
    queryDatabase.mockRejectedValue(
      new Error(
        'password authentication failed for postgresql://admin:secret@db/internal',
      ),
    );

    await expect(controller.getReadiness()).rejects.toMatchObject({
      status: 503,
      response: {
        status: 'unavailable',
        service: 'bigotti-backend',
        checks: { database: 'down' },
        timestamp: expect.any(String),
      },
    });

    try {
      await controller.getReadiness();
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(JSON.stringify(error)).not.toMatch(
        /admin|secret|internal|DATABASE_URL|postgres(?:ql)?:\/\/|connection/i,
      );
    }
  });

  it('handles a database check timeout with a sanitized 503', async () => {
    jest.useFakeTimers();
    queryDatabase.mockReturnValue(new Promise(() => undefined));

    const readiness = controller.getReadiness();
    const assertion = expect(readiness).rejects.toMatchObject({
      status: 503,
      response: {
        status: 'unavailable',
        checks: { database: 'down' },
      },
    });
    await jest.advanceTimersByTimeAsync(2_000);

    await assertion;
  });
});
