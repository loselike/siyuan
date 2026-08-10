import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { resetAndSeedDatabase } from './seed.js';

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const seedMode = resolveDatabaseSeedMode(process.env);
    if (seedMode === 'DISABLED') {
      if (process.env.NODE_ENV === 'production' && (process.env.SEED_ON_START === 'true' || process.env.SEED_ON_EMPTY === 'true')) {
        this.logger.warn('生产环境已忽略数据库自动种子配置');
      }
      return;
    }
    if (seedMode === 'RESET') {
      await resetAndSeedDatabase(this.prisma);
      return;
    }

    if (seedMode === 'EMPTY_ONLY') {
      const userCount = await this.prisma.user.count();
      if (userCount === 0) {
        await resetAndSeedDatabase(this.prisma);
      }
    }
  }
}

export function resolveDatabaseSeedMode(environment: NodeJS.ProcessEnv): 'DISABLED' | 'RESET' | 'EMPTY_ONLY' {
  if (environment.NODE_ENV === 'production') return 'DISABLED';
  if (environment.SEED_ON_START === 'true') return 'RESET';
  if (environment.SEED_ON_EMPTY === 'true') return 'EMPTY_ONLY';
  return 'DISABLED';
}
