import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import express = require('express');
import type { Request, Response } from 'express';

const expressServer = express();
let isInitialized = false;

async function bootstrap() {
  if (isInitialized) return;
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressServer), { logger: false });
  app.enableCors({ origin: '*', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.init();
  isInitialized = true;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  expressServer(req, res);
}
