import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = 'Bigotti@2026';

async function createUsers() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: 'superadmin@bigotti.tn' },
    update: {
      fullName: 'Super Admin Bigotti',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      fullName: 'Super Admin Bigotti',
      email: 'superadmin@bigotti.tn',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@bigotti.tn' },
    update: {
      fullName: 'Admin Boutique Bigotti',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      fullName: 'Admin Boutique Bigotti',
      email: 'admin@bigotti.tn',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@bigotti.tn' },
    update: {
      fullName: 'Manager Bigotti',
      passwordHash,
      role: 'MANAGER',
      isActive: true,
    },
    create: {
      fullName: 'Manager Bigotti',
      email: 'manager@bigotti.tn',
      passwordHash,
      role: 'MANAGER',
      isActive: true,
    },
  });
}

async function createCategories() {
  const categories = [
    {
      name: 'Chemises',
      slug: 'chemises',
      description: 'Chemises élégantes pour homme.',
    },
    {
      name: 'Pantalons',
      slug: 'pantalons',
      description: 'Pantalons habillés et casual.',
    },
    {
      name: 'Costumes',
      slug: 'costumes',
      description: 'Costumes et tenues de cérémonie.',
    },
    {
      name: 'Vestes',
      slug: 'vestes',
      description: 'Vestes et blazers pour homme.',
    },
    {
      name: 'Pulls',
      slug: 'pulls',
      description: 'Pulls et mailles.',
    },
    {
      name: 'Chaussures',
      slug: 'chaussures',
      description: 'Chaussures habillées et casual.',
    },
    {
      name: 'Accessoires',
      slug: 'accessoires',
      description: 'Ceintures, montres, parfums et accessoires.',
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
  }
}

async function createCollections() {
  const collections = [
    {
      name: 'Nouvelle Collection Été 2026',
      slug: 'nouvelle-collection-ete-2026',
      description: 'Les nouvelles pièces Bigotti pour la saison été 2026.',
      isFeatured: true,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-09-30'),
    },
    {
      name: 'Collection Business',
      slug: 'collection-business',
      description: 'Tenues élégantes pour le travail et les rendez-vous.',
      isFeatured: true,
      startDate: null,
      endDate: null,
    },
    {
      name: 'Collection Cérémonie',
      slug: 'collection-ceremonie',
      description: 'Costumes et tenues pour mariages et événements.',
      isFeatured: false,
      startDate: null,
      endDate: null,
    },
  ];

  for (const collection of collections) {
    await prisma.collection.upsert({
      where: { slug: collection.slug },
      update: {
        name: collection.name,
        description: collection.description,
        isActive: true,
        isFeatured: collection.isFeatured,
        startDate: collection.startDate,
        endDate: collection.endDate,
      },
      create: {
        ...collection,
        isActive: true,
      },
    });
  }
}

async function createSaleCampaigns() {
  const saleCampaigns = [
    {
      name: 'Soldes Été 2026',
      slug: 'soldes-ete-2026',
      description: 'Remises spéciales sur une sélection de produits été.',
      isActive: true,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-08-31'),
    },
    {
      name: 'Fin de Série',
      slug: 'fin-de-serie',
      description: 'Dernières pièces disponibles avec prix réduit.',
      isActive: true,
      startDate: null,
      endDate: null,
    },
  ];

  for (const campaign of saleCampaigns) {
    await prisma.saleCampaign.upsert({
      where: { slug: campaign.slug },
      update: {
        name: campaign.name,
        description: campaign.description,
        isActive: campaign.isActive,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      },
      create: campaign,
    });
  }
}

async function main() {
  console.log('Création des utilisateurs internes...');
  await createUsers();

  console.log('Création des catégories...');
  await createCategories();

  console.log('Création des collections...');
  await createCollections();

  console.log('Création des campagnes de solde...');
  await createSaleCampaigns();

  console.log('Seed minimal terminé avec succès.');
  console.log('');
  console.log('Comptes demo créés :');
  console.log('superadmin@bigotti.tn / Bigotti@2026');
  console.log('admin@bigotti.tn / Bigotti@2026');
  console.log('manager@bigotti.tn / Bigotti@2026');
}

main()
  .catch((error) => {
    console.error('Erreur pendant le seed minimal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
