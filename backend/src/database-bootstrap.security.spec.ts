import {
  createDemoUsers,
  type DemoUserStore,
  validateDevelopmentSeedEnvironment,
} from '../prisma/seed-development';
import {
  bootstrapSuperAdmin,
  type BootstrapStore,
  readBootstrapInput,
} from '../scripts/bootstrap-superadmin.logic';

const existingUser = {
  id: 'existing-id',
  fullName: 'Existing User',
  email: 'existing@bigotti.tn',
  passwordHash: 'preserved-hash',
  role: 'ADMIN',
  isActive: false,
};

describe('development seed security', () => {
  it('refuses NODE_ENV=production', () => {
    expect(() =>
      validateDevelopmentSeedEnvironment({
        NODE_ENV: 'production',
        SEED_DEMO_PASSWORD: 'a-secure-value',
      }),
    ).toThrow(/refusing.*production/i);
  });

  it('refuses a missing SEED_DEMO_PASSWORD', () => {
    expect(() => validateDevelopmentSeedEnvironment({ NODE_ENV: 'development' })).toThrow(
      /SEED_DEMO_PASSWORD is required/,
    );
  });

  it("does not overwrite an existing user's sensitive fields", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce({ ...existingUser, email: 'admin@bigotti.tn' })
      .mockResolvedValueOnce({ ...existingUser, email: 'manager@bigotti.tn' });
    const create = jest.fn();
    const hashPassword = jest.fn();

    await createDemoUsers(
      { user: { findUnique, create } } as DemoUserStore,
      'not-used-password',
      hashPassword,
    );

    expect(create).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(existingUser).toMatchObject({
      passwordHash: 'preserved-hash',
      role: 'ADMIN',
      isActive: false,
    });
  });
});

describe('SUPER_ADMIN bootstrap security', () => {
  it('refuses missing variables', () => {
    expect(() => readBootstrapInput({})).toThrow(/are required/);
  });

  it('refuses weak passwords', () => {
    expect(() =>
      readBootstrapInput({
        BOOTSTRAP_SUPERADMIN_NAME: 'Owner',
        BOOTSTRAP_SUPERADMIN_EMAIL: 'owner@bigotti.tn',
        BOOTSTRAP_SUPERADMIN_PASSWORD: 'too-short',
      }),
    ).toThrow(/at least 12 characters/);
  });

  it('refuses when an active SUPER_ADMIN exists', async () => {
    const store = makeBootstrapStore({ activeSuperAdmins: 1 });
    await expect(runBootstrap(store)).rejects.toThrow(/active SUPER_ADMIN already exists/);
    expect(store.user.create).not.toHaveBeenCalled();
  });

  it('refuses when the target email already exists without changing it', async () => {
    const store = makeBootstrapStore({ targetUser: existingUser });
    await expect(runBootstrap(store)).rejects.toThrow(/already exists.*No password, role, or status/i);
    expect(store.user.count).not.toHaveBeenCalled();
    expect(store.user.create).not.toHaveBeenCalled();
  });

  it('creates exactly one active SUPER_ADMIN in an empty environment', async () => {
    const store = makeBootstrapStore();
    const result = await runBootstrap(store);

    expect(store.user.create).toHaveBeenCalledTimes(1);
    expect(store.user.create).toHaveBeenCalledWith({
      data: {
        fullName: 'First Owner',
        email: 'owner@bigotti.tn',
        passwordHash: 'bcrypt-hash',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    expect(result).toEqual({
      id: 'new-id',
      fullName: 'First Owner',
      email: 'owner@bigotti.tn',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
  });

  it('does not return or log a password', async () => {
    const consoleLog = jest.spyOn(console, 'log').mockImplementation();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const result = await runBootstrap(makeBootstrapStore());

    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });
});

function makeBootstrapStore(options: {
  targetUser?: typeof existingUser;
  activeSuperAdmins?: number;
} = {}): BootstrapStore & { user: { create: jest.Mock; count: jest.Mock } } {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(options.targetUser ?? null),
      count: jest.fn().mockResolvedValue(options.activeSuperAdmins ?? 0),
      create: jest.fn().mockResolvedValue({
        id: 'new-id',
        fullName: 'First Owner',
        email: 'owner@bigotti.tn',
        passwordHash: 'bcrypt-hash',
        role: 'SUPER_ADMIN',
        isActive: true,
      }),
    },
  } as BootstrapStore & { user: { create: jest.Mock; count: jest.Mock } };
}

function runBootstrap(store: BootstrapStore) {
  return bootstrapSuperAdmin(
    store,
    {
      fullName: 'First Owner',
      email: 'owner@bigotti.tn',
      password: 'secure-value-123',
    },
    jest.fn().mockResolvedValue('bcrypt-hash'),
  );
}
