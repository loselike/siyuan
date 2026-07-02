import type { INestApplication } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { json, static as serveStatic, urlencoded } from 'express';

export function configureApp(app: INestApplication) {
  const uploadDir = process.env.UPLOAD_DIR ?? (process.env.NODE_ENV === 'production' ? '/app/uploads/vouchers' : join(process.cwd(), 'uploads/vouchers'));
  mkdirSync(uploadDir, { recursive: true });
  app.use('/api/uploads', serveStatic(dirname(uploadDir), { fallthrough: false }));
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));
  app.enableCors();
  app.setGlobalPrefix('api');
}
