import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { resetAndSeedDatabase } from './seed.js';

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.SEED_ON_START === 'true') {
      await resetAndSeedDatabase(this.prisma);
      return;
    }

    if (process.env.SEED_ON_EMPTY === 'true') {
      const userCount = await this.prisma.user.count();
      if (userCount === 0) {
        await resetAndSeedDatabase(this.prisma);
      }
    }
  }
}
