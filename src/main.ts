import { NestFactory } from '@nestjs/core';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { AppErrorFilter } from './common/app-error.filter';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import { DataSource } from 'typeorm';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

const PORT = parseInt(process.env.PORT || '8080');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

  app.enableCors();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    new RequestLoggerMiddleware().use.bind(new RequestLoggerMiddleware()),
  );
  app.useGlobalFilters(new AppErrorFilter());

  // Load OpenAPI spec from file
  const jsonPath = path.join(__dirname, '..', 'openapi.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const document = JSON.parse(jsonContent) as OpenAPIObject;
  SwaggerModule.setup('api', app, document);

  await app.listen(PORT);

  console.log(`Application running on port ${PORT}`);

  const shutdown = async () => {
    console.log('Closing HTTP server...');
    await app.close();
    console.log('Closing database connection...');
    await dataSource.destroy();
    console.log('Database connection closed');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();