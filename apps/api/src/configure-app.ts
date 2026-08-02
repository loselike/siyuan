import type { INestApplication } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
import { json, static as serveStatic, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';

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
  // Imported workbooks and historical Dubai conversions contain confidential
  // source prices. Generated business images are also served only through a
  // permission-checked API, never through the public upload tree.
  const confidentialPricingSegments = new Set([
    'pricing-imports',
    'pricing-dubai',
    'pricing-dubai-business',
    'misc-fee-imports',
    'misc-fee-attachments'
  ]);
  app.use('/api/uploads', (request: Request, response: Response, next: NextFunction) => {
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(request.url).replace(/\\/g, '/');
    } catch {
      response.sendStatus(404);
      return;
    }
    const segments = decodedPath.split('/').filter(Boolean);
    if (segments.some((segment) => confidentialPricingSegments.has(segment))) {
      response.sendStatus(404);
      return;
    }
    next();
  });
  app.use('/api/uploads', serveStatic(uploadRoot, { fallthrough: false }));
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));
  app.enableCors();
  app.setGlobalPrefix('api');
}
