import 'reflect-metadata';
import './modules/load-local-env.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module.js';

const app = await NestFactory.create(AppModule);
app.enableCors();
app.setGlobalPrefix('api');

const port = Number(process.env.API_PORT ?? 3001);
await app.listen(port);
