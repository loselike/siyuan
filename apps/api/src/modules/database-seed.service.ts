import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { resetAndSeedDatabase } from './seed.js';

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.SEED_ON_START === 'true') {
      await resetAndSeedDatabase(this.prisma);
    }
  }
}
