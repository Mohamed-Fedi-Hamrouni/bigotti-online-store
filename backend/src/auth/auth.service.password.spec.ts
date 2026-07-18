import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { AuthService } from './auth.service';

describe('AuthService.changePassword', () => {
  const user = {
    id: 'admin-1',
    fullName: 'Admin Bigotti',
    email: 'admin@bigotti.tn',
    role: 'ADMIN',
    isActive: true,
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let prisma: any;
  let service: AuthService;
  let authSessions: any;

  beforeEach(async () => {
    user.passwordHash = await bcrypt.hash('ancien-secret', 4);
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockImplementation(({ data }) => {
          user.passwordHash = data.passwordHash;
          return Promise.resolve(user);
        }),
      },
      adminSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((operations) => Promise.all(operations)),
    };
    authSessions = {
      createAdminSession: jest.fn().mockResolvedValue({
        session: { id: 'new-session' },
        refreshToken: 'refresh-token',
      }),
    };
    service = new AuthService(
      prisma,
      { signAsync: jest.fn().mockResolvedValue('access-token') } as any,
      {
        assertCanAttempt: jest.fn(),
        recordFailure: jest.fn(),
        reset: jest.fn(),
      } as any,
      authSessions,
      {} as any,
    );
  });

  it('changes the password and revokes every admin session', async () => {
    const result = await service.changePassword('admin-1', {
      currentPassword: 'ancien-secret',
      confirmNewPassword: 'nouveau-secret1',
      newPassword: 'nouveau-secret1',
    });

    expect(result.message).toContain('veuillez vous reconnecter');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('password');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { passwordHash: expect.any(String) },
    });
    expect(prisma.adminSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'admin-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    await expect(
      service.login({ email: user.email, password: 'ancien-secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login({ email: user.email, password: 'nouveau-secret1' }),
    ).resolves.toHaveProperty('accessToken');
    expect(authSessions.createAdminSession).toHaveBeenCalledTimes(1);
  });

  it('rejects a password identical to the current password', async () => {
    await expect(
      service.changePassword('admin-1', {
        currentPassword: 'ancien-secret',
        newPassword: 'ancien-secret',
        confirmNewPassword: 'ancien-secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a wrong current password', async () => {
    await expect(
      service.changePassword('admin-1', {
        currentPassword: 'incorrect',
        newPassword: 'nouveau-secret1',
        confirmNewPassword: 'nouveau-secret1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a mismatching confirmation', async () => {
    await expect(
      service.changePassword('admin-1', {
        currentPassword: 'ancien-secret',
        newPassword: 'nouveau-secret1',
        confirmNewPassword: 'autre-secret1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
