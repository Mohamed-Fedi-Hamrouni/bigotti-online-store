import { BadRequestException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { AuthService } from './auth.service';

const roles = ['MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const;

describe('AuthService - profil administratif', () => {
  const originalUser = {
    id: 'user-1',
    fullName: 'Ancien Nom',
    email: 'admin@bigotti.tn',
    role: 'ADMIN',
    isActive: true,
    passwordHash: 'hash-secret',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function createService(role: (typeof roles)[number] = 'ADMIN') {
    const user = { ...originalUser, role };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest
          .fn()
          .mockImplementation(({ where, data }) =>
            Promise.resolve({ ...user, ...data, id: where.id }),
          ),
      },
    };
    return {
      prisma,
      service: new AuthService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      ),
    };
  }

  it.each(roles)('autorise %s à lire son propre profil', async (role) => {
    const { service } = createService(role);
    const profile = await service.getProfile('user-1');
    expect(profile).toMatchObject({ id: 'user-1', role });
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('normalise et modifie uniquement le nom de l’utilisateur du token', async () => {
    const { service, prisma } = createService();
    const maliciousPayload = {
      fullName: '  Nouveau    Nom  ',
      email: 'pirate@example.com',
      role: 'SUPER_ADMIN',
      isActive: false,
      id: 'autre-utilisateur',
    };

    const result = await service.updateProfile(
      'user-1',
      maliciousPayload as never,
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { fullName: 'Nouveau Nom' },
    });
    expect(result).toMatchObject({
      email: originalUser.email,
      role: originalUser.role,
      isActive: true,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('refuse un nom vide', async () => {
    const { service, prisma } = createService();
    await expect(
      service.updateProfile('user-1', { fullName: ' ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
