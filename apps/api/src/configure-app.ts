import type { INestApplication } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
import { json, urlencoded } from 'express';

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
  app.enableCors();
  app.setGlobalPrefix('api');
}
