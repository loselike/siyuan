import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSeedService, resolveDatabaseSeedMode } from './database-seed.service.js';

describe('database seed startup policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('never queries or seeds the database in production', async () => {
    const environment = {
      NODE_ENV: 'production',
      SEED_ON_START: 'true',
      SEED_ON_EMPTY: 'true'
    };
    vi.stubEnv('NODE_ENV', environment.NODE_ENV);
    vi.stubEnv('SEED_ON_START', environment.SEED_ON_START);
    vi.stubEnv('SEED_ON_EMPTY', environment.SEED_ON_EMPTY);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const count = vi.fn();
    const service = new DatabaseSeedService({ user: { count } } as never);

    expect(resolveDatabaseSeedMode(environment)).toBe('DISABLED');
    await service.onModuleInit();
    expect(count).not.toHaveBeenCalled();
  });

  it('keeps reset seed behind an explicit non-production flag', () => {
    const environment = { NODE_ENV: 'development', SEED_ON_START: 'true' };

    expect(resolveDatabaseSeedMode(environment)).toBe('RESET');
  });

  it('keeps empty-only seed behind an explicit non-production flag', () => {
    const environment = { NODE_ENV: 'test', SEED_ON_EMPTY: 'true' };

    expect(resolveDatabaseSeedMode(environment)).toBe('EMPTY_ONLY');
  });

  it('keeps automatic seed disabled by default', () => {
    expect(resolveDatabaseSeedMode({ NODE_ENV: 'development' })).toBe('DISABLED');
  });
});
