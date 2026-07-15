type Environment = Record<string, string | undefined>;

type DemoUser = {
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';
};

export type DemoUserStore = {
  user: {
    findUnique(args: { where: { email: string } }): Promise<unknown | null>;
    create(args: {
      data: DemoUser & { passwordHash: string; isActive: true };
    }): Promise<unknown>;
  };
};

const DEMO_USERS: DemoUser[] = [
  { fullName: 'Super Admin Bigotti', email: 'superadmin@bigotti.tn', role: 'SUPER_ADMIN' },
  { fullName: 'Admin Boutique Bigotti', email: 'admin@bigotti.tn', role: 'ADMIN' },
  { fullName: 'Manager Bigotti', email: 'manager@bigotti.tn', role: 'MANAGER' },
];

export function validateDevelopmentSeedEnvironment(env: Environment): string {
  if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
    throw new Error('Refusing to run the development demo seed when NODE_ENV=production.');
  }

  const password = env.SEED_DEMO_PASSWORD;
  if (!password) {
    throw new Error('SEED_DEMO_PASSWORD is required for the development demo seed.');
  }
  if (password.length < 12) {
    throw new Error('SEED_DEMO_PASSWORD must contain at least 12 characters.');
  }
  return password;
}

export async function createDemoUsers(
  store: DemoUserStore,
  password: string,
  hashPassword: (password: string) => Promise<string>,
): Promise<void> {
  let passwordHash: string | undefined;

  for (const demoUser of DEMO_USERS) {
    const existing = await store.user.findUnique({ where: { email: demoUser.email } });
    if (existing) continue;

    passwordHash ??= await hashPassword(password);
    await store.user.create({
      data: { ...demoUser, passwordHash, isActive: true },
    });
  }
}
