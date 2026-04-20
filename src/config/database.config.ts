import { DataSourceOptions } from 'typeorm';

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'bookmyevent',
  entities: [__dirname + '/../entities/*.entity.js'],
  migrations: [__dirname + '/../migrations/*.js'],
  migrationsTableName: 'migrations',
  logging: process.env.NODE_ENV !== 'production',
  synchronize: false,
};
