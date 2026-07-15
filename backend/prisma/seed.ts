import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import {
  createDemoUsers,
  validateDevelopmentSeedEnvironment,
} from './seed-development';

async function createCategories(prisma: PrismaClient) {
  const categories = [
    { name: 'Chemises', slug: 'chemises', description: 'Chemises élégantes pour homme.' },
    { name: 'Pantalons', slug: 'pantalons', description: 'Pantalons habillés et casual.' },
    { name: 'Costumes', slug: 'costumes', description: 'Costumes et tenues de cérémonie.' },
    { name: 'Vestes', slug: 'vestes', description: 'Vestes et blazers pour homme.' },
    { name: 'Pulls', slug: 'pulls', description: 'Pulls et mailles.' },
    { name: 'Chaussures', slug: 'chaussures', description: 'Chaussures habillées et casual.' },
    { name: 'Accessoires', slug: 'accessoires', description: 'Ceintures, montres, parfums et accessoires.' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, isActive: true },
      create: { ...category, isActive: true },
    });
  }
}

async function createCollections(prisma: PrismaClient) {
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
      create: { ...collection, isActive: true },
    });
  }
}

async function createSaleCampaigns(prisma: PrismaClient) {
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
  const password = validateDevelopmentSeedEnvironment(process.env);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let prisma: PrismaClient | undefined;

  try {
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    console.log('Création des utilisateurs internes de démonstration manquants...');
    await createDemoUsers(prisma, password, (value) => bcrypt.hash(value, 10));
    console.log('Création des catégories...');
    await createCategories(prisma);
    console.log('Création des collections...');
    await createCollections(prisma);
    console.log('Création des campagnes de solde...');
    await createSaleCampaigns(prisma);
    console.log('Seed de développement terminé avec succès.');
  } finally {
    try {
      await prisma?.$disconnect();
    } finally {
      await pool.end();
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : '';
  const isSafeValidationError =
    message.startsWith('Refusing to run') || message.startsWith('SEED_DEMO_PASSWORD');
  console.error(isSafeValidationError ? message : 'Échec du seed de développement.');
  process.exitCode = 1;
});
