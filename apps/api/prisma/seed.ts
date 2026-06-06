import { PrismaClient } from '@prisma/client';
import { resetAndSeedDatabase } from '../src/modules/seed.js';

const prisma = new PrismaClient();

try {
  await resetAndSeedDatabase(prisma);
  process.stdout.write('Seeded M1+M2 data\n');
} finally {
  await prisma.$disconnect();
}
