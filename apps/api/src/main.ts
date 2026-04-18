import { NestFactory } from '@nestjs/core';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { AppErrorFilter } from './common/app-error.filter';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    new RequestLoggerMiddleware().use.bind(new RequestLoggerMiddleware()),
  );
  app.useGlobalFilters(new AppErrorFilter());

  const jsonPath = path.join(__dirname, '..', '..', '..', 'openapi.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const document = JSON.parse(jsonContent) as OpenAPIObject;
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}

void bootstrap();
