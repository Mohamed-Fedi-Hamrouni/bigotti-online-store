type Environment = Record<string, string | undefined>;

type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
};

export type SafeAdmin = Pick<UserRecord, 'id' | 'fullName' | 'email' | 'role' | 'isActive'>;

export type BootstrapStore = {
  user: {
    findUnique(args: { where: { email: string } }): Promise<UserRecord | null>;
    count(args: { where: { role: 'SUPER_ADMIN'; isActive: true } }): Promise<number>;
    create(args: {
      data: {
        fullName: string;
        email: string;
        passwordHash: string;
        role: 'SUPER_ADMIN';
        isActive: true;
      };
    }): Promise<UserRecord>;
  };
};

export type BootstrapInput = { fullName: string; email: string; password: string };

export function readBootstrapInput(env: Environment): BootstrapInput {
  const fullName = env.BOOTSTRAP_SUPERADMIN_NAME?.trim();
  const email = env.BOOTSTRAP_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = env.BOOTSTRAP_SUPERADMIN_PASSWORD;

  if (!fullName || !email || !password) {
    throw new Error(
      'BOOTSTRAP_SUPERADMIN_NAME, BOOTSTRAP_SUPERADMIN_EMAIL, and BOOTSTRAP_SUPERADMIN_PASSWORD are required.',
    );
  }
  if (password.length < 12) {
    throw new Error('BOOTSTRAP_SUPERADMIN_PASSWORD must contain at least 12 characters.');
  }
  return { fullName, email, password };
}

export async function bootstrapSuperAdmin(
  store: BootstrapStore,
  input: BootstrapInput,
  hashPassword: (password: string) => Promise<string>,
): Promise<SafeAdmin> {
  const existingEmail = await store.user.findUnique({ where: { email: input.email } });
  if (existingEmail) {
    throw new Error(
      'A user with the bootstrap email already exists. No password, role, or status was changed.',
    );
  }

  const activeSuperAdmins = await store.user.count({
    where: { role: 'SUPER_ADMIN', isActive: true },
  });
  if (activeSuperAdmins > 0) {
    throw new Error(
      'An active SUPER_ADMIN already exists. Create additional administrators through /admin/utilisateurs.',
    );
  }

  const passwordHash = await hashPassword(input.password);
  const created = await store.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  const { id, fullName, email, role, isActive } = created;
  return { id, fullName, email, role, isActive };
}
