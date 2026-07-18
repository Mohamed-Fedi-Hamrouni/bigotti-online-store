import { readFileSync } from 'fs';
import { resolve } from 'path';

function readFrontendFile(relativePath: string) {
  return readFileSync(
    resolve(process.cwd(), '..', 'frontend', relativePath),
    'utf8',
  );
}

describe('Contrats frontend de sécurité administrative', () => {
  it('/admin/securite est une redirection serveur sans second formulaire', () => {
    const source = readFrontendFile('app/admin/securite/page.tsx');

    expect(source).not.toContain('"use client"');
    expect(source).toContain('redirect("/admin/profil#securite")');
    expect(source).not.toContain('<form');
  });

  it('la section sécurité principale possède la cible d’ancre', () => {
    const source = readFrontendFile('app/admin/profil/page.tsx');
    expect(source).toContain('id="securite"');
  });
});

describe('Contrat Prisma email client unique', () => {
  it('déclare Customer.email nullable et unique dans le schéma et la migration', () => {
    const schema = readFileSync(
      resolve(process.cwd(), 'prisma', 'schema.prisma'),
      'utf8',
    );
    const migration = readFileSync(
      resolve(
        process.cwd(),
        'prisma',
        'migrations',
        '20260718173000_add_customer_email_verification',
        'migration.sql',
      ),
      'utf8',
    );

    expect(schema).toMatch(/email\s+String\?\s+@unique/);
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email")',
    );
  });
});
