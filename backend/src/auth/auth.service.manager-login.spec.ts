import * as bcrypt from 'bcryptjs';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { AuthService } from './auth.service';

describe('AuthService - connexion MANAGER', () => {
  it('autorise un MANAGER actif avec un mot de passe valide', async () => {
    const user = {
      id: 'manager-1',
      fullName: 'Manager Bigotti',
      email: 'manager@bigotti.tn',
      role: 'MANAGER',
      isActive: true,
      passwordHash: await bcrypt.hash('Manager123', 4),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    const attempts = {
      assertCanAttempt: jest.fn(),
      recordFailure: jest.fn(),
      reset: jest.fn(),
    };
    const sessions = {
      createAdminSession: jest.fn().mockResolvedValue({
        session: { id: 'session-1' },
        refreshToken: 'refresh-token',
      }),
    };
    const service = new AuthService(
      prisma as never,
      jwt as never,
      attempts as never,
      sessions as never,
      {} as never,
    );

    await expect(
      service.login({ email: user.email, password: 'Manager123' }),
    ).resolves.toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ role: 'MANAGER' }),
      }),
    );
  });
});
