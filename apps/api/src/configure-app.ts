import type { INestApplication } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
import { json, urlencoded } from 'express';

export type CorsPolicy =
  | { enabled: false; origins: [] }
  | { enabled: true; origins: '*' | string[] };

export function resolveCorsPolicy(environment: NodeJS.ProcessEnv): CorsPolicy {
  const configuredOrigins = parseAllowedCorsOrigins(environment.CORS_ALLOWED_ORIGINS);
  if (configuredOrigins.length > 0) {
    return { enabled: true, origins: configuredOrigins };
  }
  if (environment.NODE_ENV === 'production') {
    return { enabled: false, origins: [] };
  }
  return { enabled: true, origins: '*' };
}

function parseAllowedCorsOrigins(rawValue: string | undefined): string[] {
  if (!rawValue?.trim()) return [];
  const origins = rawValue.split(',').map((value) => value.trim()).filter(Boolean);
  return Array.from(new Set(origins.map((value, index) => normalizeCorsOrigin(value, index))));
}

function normalizeCorsOrigin(value: string, index: number): string {
  try {
    if (value === '*') throw new Error('wildcard');
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || url.pathname !== '/'
      || url.search
      || url.hash) {
      throw new Error('invalid origin');
    }
    return url.origin;
  } catch {
    throw new Error(`CORS_ALLOWED_ORIGINS 第 ${index + 1} 项必须是无路径的 HTTP(S) origin`);
  }
}

export function resolveUploadRoot() {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (!configured) {
    return process.env.NODE_ENV === 'production' ? '/app/uploads' : join(process.cwd(), 'uploads');
  }
  const normalized = normalize(configured);
  return basename(normalized) === 'vouchers' ? dirname(normalized) : normalized;
}

export function resolveUploadDirectory(subdir: string) {
  const root = resolveUploadRoot();
  return {
    root,
    dir: join(root, subdir),
    publicPath: `/api/uploads/${subdir}`
  };
}

export function configureApp(app: INestApplication) {
  const uploadRoot = resolveUploadRoot();
  mkdirSync(uploadRoot, { recursive: true });
  // Uploads are deny-by-default. Every downloadable business file must be
  // returned by a controller that authenticates the caller and verifies scope.
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));
  const corsPolicy = resolveCorsPolicy(process.env);
  if (corsPolicy.enabled) {
    app.enableCors(corsPolicy.origins === '*' ? undefined : { origin: corsPolicy.origins });
  }
  app.setGlobalPrefix('api');
}
