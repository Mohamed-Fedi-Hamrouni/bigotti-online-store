import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import {
  bootstrapSuperAdmin,
  readBootstrapInput,
} from './bootstrap-superadmin.logic';

const ADMIN_BCRYPT_ROUNDS = 10;

async function main() {
  const input = readBootstrapInput(process.env);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let prisma: PrismaClient | undefined;

  try {
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const created = await prisma.$transaction(
      (transaction) =>
        bootstrapSuperAdmin(transaction, input, (password) =>
          bcrypt.hash(password, ADMIN_BCRYPT_ROUNDS),
        ),
      { isolationLevel: 'Serializable' },
    );
    console.log(created);
  } finally {
    try {
      await prisma?.$disconnect();
    } finally {
      await pool.end();
    }
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    const isSafeExpectedError =
      message.startsWith('BOOTSTRAP_SUPERADMIN_') ||
      message.startsWith('A user with the bootstrap email') ||
      message.startsWith('An active SUPER_ADMIN');
    console.error(isSafeExpectedError ? message : 'SUPER_ADMIN bootstrap failed.');
    process.exitCode = 1;
  });
}
