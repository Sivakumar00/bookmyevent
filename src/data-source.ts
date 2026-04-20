import { DataSource } from 'typeorm';

import { databaseConfig } from './config/database.config';

export const AppDataSource = new DataSource({
  ...databaseConfig,
  entities: ['dist/entities/*.js'],
  migrations: ['dist/migrations/*.js'],
});
