import { BadRequestException } from '@nestjs/common';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { UsersService } from './users.service';

const currentUser: JwtPayload = {
  sub: 'current',
  email: 'root@bigotti.tn',
  role: 'SUPER_ADMIN',
  sessionId: 'session',
  tokenType: 'admin',
};

const target = {
  id: 'target',
  fullName: 'Cible',
  email: 'cible@bigotti.tn',
  passwordHash: 'secret',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService security rules', () => {
  let prisma: any;
  let tx: any;
  let service: UsersService;

  beforeEach(() => {
    tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(target),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...target, ...data }),
        ),
      },
      adminSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };
    prisma = {
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    service = new UsersService(prisma);
  });

  it('rejects changing your own role', async () => {
    await expect(
      service.updateRole('current', { role: 'ADMIN' }, currentUser),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects deactivating your own account', async () => {
    await expect(
      service.updateStatus('current', { isActive: false }, currentUser),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not demote the last active SUPER_ADMIN', async () => {
    tx.user.count.mockResolvedValue(1);
    await expect(
      service.updateRole('target', { role: 'ADMIN' }, currentUser),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('does not deactivate the last active SUPER_ADMIN', async () => {
    tx.user.count.mockResolvedValue(1);
    await expect(
      service.updateStatus('target', { isActive: false }, currentUser),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('changes another user role and revokes their sessions', async () => {
    const result = await service.updateRole(
      'target',
      { role: 'MANAGER' },
      currentUser,
    );
    expect(result.role).toBe('MANAGER');
    expect(tx.adminSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'target', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' },
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('revokes sessions when another account is deactivated', async () => {
    const result = await service.updateStatus(
      'target',
      { isActive: false },
      currentUser,
    );
    expect(result.isActive).toBe(false);
    expect(tx.adminSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'target', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
