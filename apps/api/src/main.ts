import 'reflect-metadata';
import './modules/load-local-env.js';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './configure-app.js';
import { AppModule } from './modules/app.module.js';

const app = await NestFactory.create(AppModule, { bodyParser: false });
configureApp(app);

const port = Number(process.env.API_PORT ?? 3001);
await app.listen(port);
