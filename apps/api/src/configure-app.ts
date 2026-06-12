import type { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';

export function configureApp(app: INestApplication) {
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));
  app.enableCors();
  app.setGlobalPrefix('api');
}
