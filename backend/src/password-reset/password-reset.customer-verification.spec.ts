jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService - client vérifié', () => {
  it('ne sélectionne que les comptes mot de passe dont l’email est vérifié', async () => {
    const prisma = {
      adminPasswordResetToken: { deleteMany: jest.fn().mockResolvedValue({}) },
      customerPasswordResetToken: {
        deleteMany: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
    };
    const mail = { sendPasswordResetEmail: jest.fn() };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const service = new PasswordResetService(
      prisma as never,
      mail as never,
      config as never,
    );

    await service.requestCustomerReset({ email: 'client@example.com' });

    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          emailVerifiedAt: { not: null },
        }),
      }),
    );
    expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
