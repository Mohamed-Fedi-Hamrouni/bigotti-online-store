import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcryptjs';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { CustomerAuthService } from './customer-auth.service';

const baseCustomer = {
  id: 'customer-1',
  fullName: 'Client Test',
  phone: '20123456',
  email: 'client@example.com',
  passwordHash: '',
  emailVerifiedAt: null as Date | null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function createService(customerOverrides: Record<string, unknown> = {}) {
  const customer = {
    ...baseCustomer,
    passwordHash: await hash('Password1', 4),
    ...customerOverrides,
  };
  const prisma = {
    customer: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue(customer),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ ...customer, ...data }),
        ),
    },
    customerIdentity: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback(prisma),
    ),
  };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('access-token'),
    verify: jest.fn().mockReturnValue({
      sub: customer.id,
      email: customer.email,
      sessionId: 'session-1',
      tokenType: 'customer',
    }),
  };
  const attempts = {
    assertCanAttempt: jest.fn(),
    recordFailure: jest.fn(),
    reset: jest.fn(),
  };
  const sessions = {
    createCustomerSession: jest.fn().mockResolvedValue({
      session: { id: 'session-1' },
      refreshToken: 'refresh-token',
    }),
    getActiveCustomerSession: jest.fn().mockResolvedValue({ customer }),
    revokeAllCustomerSessions: jest.fn().mockResolvedValue(1),
  };
  const google = { verifyCredential: jest.fn() };
  const verification = { sendForCustomer: jest.fn().mockResolvedValue({}) };
  const service = new CustomerAuthService(
    prisma as never,
    jwt as never,
    attempts as never,
    sessions as never,
    google as never,
    verification as never,
  );

  return { service, customer, prisma, sessions, verification, google };
}

describe('CustomerAuthService - vérification email', () => {
  it('inscrit un compte non vérifié, envoie l’email et ne crée pas de session', async () => {
    const { service, prisma, sessions, verification } = await createService();
    prisma.customer.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.register({
      fullName: 'Client Test',
      phone: '20123456',
      email: 'CLIENT@example.com',
      password: 'Password1',
    });

    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'client@example.com',
          emailVerifiedAt: null,
        }),
      }),
    );
    expect(verification.sendForCustomer).toHaveBeenCalledTimes(1);
    expect(sessions.createCustomerSession).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('bloque le login après un mot de passe valide tant que l’email est non vérifié', async () => {
    const { service, prisma, sessions, customer } = await createService();
    prisma.customer.findFirst.mockResolvedValue(customer);

    await expect(
      service.login({ email: customer.email, password: 'Password1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessions.createCustomerSession).not.toHaveBeenCalled();
  });

  it('conserve l’erreur générique lorsque le mot de passe est invalide', async () => {
    const { service, prisma, customer } = await createService();
    prisma.customer.findFirst.mockResolvedValue(customer);

    await expect(
      service.login({ email: customer.email, password: 'incorrect' }),
    ).rejects.toEqual(
      expect.objectContaining({ message: 'Email ou mot de passe incorrect.' }),
    );
  });

  it('autorise un compte vérifié et crée sa session', async () => {
    const { service, prisma, sessions, customer } = await createService({
      emailVerifiedAt: new Date(),
    });
    prisma.customer.findFirst.mockResolvedValue(customer);

    await expect(
      service.login({ email: customer.email, password: 'Password1' }),
    ).resolves.toHaveProperty('accessToken');
    expect(sessions.createCustomerSession).toHaveBeenCalledTimes(1);
  });

  it('une inscription Google vérifiée initialise emailVerifiedAt', async () => {
    const { service, prisma, google } = await createService();
    google.verifyCredential.mockResolvedValue({
      subject: 'google-subject',
      email: 'google@example.com',
      fullName: 'Google Client',
      profilePicture: null,
    });
    prisma.customerIdentity.findFirst.mockResolvedValue(null);
    prisma.customer.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await service.registerWithGoogle({
      credential: 'credential',
      phone: '20123456',
    });
    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
      }),
    );
  });

  it('changer l’email réinitialise la vérification et révoque les sessions', async () => {
    const { service, prisma, sessions, verification, customer } =
      await createService({ emailVerifiedAt: new Date() });
    prisma.customer.findFirst.mockResolvedValue(null);

    const result = await service.updateProfile(
      {
        fullName: customer.fullName,
        phone: customer.phone,
        email: 'new@example.com',
      },
      'Bearer token',
    );

    expect(result.emailVerifiedAt).toBeNull();
    expect(sessions.revokeAllCustomerSessions).toHaveBeenCalledTimes(1);
    expect(verification.sendForCustomer).toHaveBeenCalledTimes(1);
  });

  it('changer seulement le nom ou le téléphone conserve la vérification', async () => {
    const verifiedAt = new Date();
    const { service, prisma, sessions, verification, customer } =
      await createService({ emailVerifiedAt: verifiedAt });
    prisma.customer.findFirst.mockResolvedValue(null);

    const result = await service.updateProfile(
      { fullName: 'Nouveau Nom', phone: '20999999', email: customer.email },
      'Bearer token',
    );

    expect(result.emailVerifiedAt).toBe(verifiedAt);
    expect(sessions.revokeAllCustomerSessions).not.toHaveBeenCalled();
    expect(verification.sendForCustomer).not.toHaveBeenCalled();
  });
});
