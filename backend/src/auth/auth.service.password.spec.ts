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

  beforeEach(async () => {
    user.passwordHash = await bcrypt.hash('ancien-secret', 4);
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      adminSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn().mockImplementation((operations) =>
        Promise.all(operations),
      ),
    };
    service = new AuthService(prisma, {} as any, {} as any, {} as any, {} as any);
  });

  it('changes the password and revokes every admin session', async () => {
    const result = await service.changePassword('admin-1', {
      currentPassword: 'ancien-secret',
      newPassword: 'nouveau-secret',
      confirmPassword: 'nouveau-secret',
    });

    expect(result.message).toContain('veuillez vous reconnecter');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: { passwordHash: expect.any(String) },
    });
    expect(prisma.adminSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'admin-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a wrong current password', async () => {
    await expect(
      service.changePassword('admin-1', {
        currentPassword: 'incorrect',
        newPassword: 'nouveau-secret',
        confirmPassword: 'nouveau-secret',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a mismatching confirmation', async () => {
    await expect(
      service.changePassword('admin-1', {
        currentPassword: 'ancien-secret',
        newPassword: 'nouveau-secret',
        confirmPassword: 'autre-secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
