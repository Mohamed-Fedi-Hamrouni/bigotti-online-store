import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { CustomerEmailVerificationService } from './customer-email-verification.service';

const config = {
  get: jest.fn((key: string) =>
    key === 'PUBLIC_FRONTEND_URL' ? 'https://shop.example' : undefined,
  ),
};

function createService(tokenOverrides: Record<string, unknown> = {}) {
  const rawToken = 'verification-token';
  const token = {
    id: 'token-1',
    customerId: 'customer-1',
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
    revokedAt: null,
    customer: {
      id: 'customer-1',
      isActive: true,
      fullName: 'Client Test',
      email: 'client@example.com',
    },
    ...tokenOverrides,
  };
  const tx = {
    customerEmailVerificationToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({ id: 'new-token' }),
    },
    customer: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    customerEmailVerificationToken: {
      findUnique: jest.fn().mockResolvedValue(token),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
    },
    customer: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const mail = { sendEmailVerification: jest.fn().mockResolvedValue({}) };

  return {
    rawToken,
    token,
    tx,
    prisma,
    mail,
    service: new CustomerEmailVerificationService(
      prisma as never,
      mail as never,
      config as never,
    ),
  };
}

describe('CustomerEmailVerificationService', () => {
  it('vérifie un token valide dans une transaction et le rend single-use', async () => {
    const { service, rawToken, prisma, tx } = createService();

    await expect(service.verify({ token: rawToken })).resolves.toEqual({
      message: 'Votre adresse email a été vérifiée avec succès.',
    });
    expect(
      prisma.customerEmailVerificationToken.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tokenHash: createHash('sha256').update(rawToken).digest('hex'),
        },
      }),
    );
    expect(tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailVerifiedAt: expect.any(Date) } }),
    );
    expect(tx.customerEmailVerificationToken.updateMany).toHaveBeenCalledTimes(
      2,
    );
  });

  it.each([
    ['expiré', { expiresAt: new Date(Date.now() - 1) }],
    ['révoqué', { revokedAt: new Date() }],
    ['déjà utilisé', { usedAt: new Date() }],
  ])('refuse un token %s', async (_label, overrides) => {
    const { service, rawToken } = createService(overrides);
    await expect(service.verify({ token: rawToken })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('un token ne peut être réclamé qu’une fois en concurrence', async () => {
    const { service, rawToken, tx } = createService();
    tx.customerEmailVerificationToken.updateMany.mockResolvedValueOnce({
      count: 0,
    });
    await expect(service.verify({ token: rawToken })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.customer.update).not.toHaveBeenCalled();
  });

  it('renvoie la réponse générique pour une adresse inconnue', async () => {
    const { service, mail } = createService();
    await expect(
      service.resend({ email: 'unknown@example.com' }),
    ).resolves.toEqual(
      expect.objectContaining({
        message: expect.stringContaining('Si un compte'),
      }),
    );
    expect(mail.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('applique la limite persistante de trois messages par heure', async () => {
    const { service, prisma, mail } = createService();
    prisma.customer.findFirst.mockResolvedValue({
      id: 'customer-1',
      email: 'client@example.com',
      fullName: 'Client Test',
    });
    prisma.customerEmailVerificationToken.count.mockResolvedValue(3);

    await service.resend({ email: 'client@example.com' });
    expect(mail.sendEmailVerification).not.toHaveBeenCalled();
  });
});
