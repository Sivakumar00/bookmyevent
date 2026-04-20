import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { readdirSync } from 'fs';
import { join } from 'path';

import { databaseConfig } from '../config/database.config';
/**
 * Get migration filtes from migrations directory
 * @returns list of migration files
 */
const getMigrations = (): string[] => {
  const migrationFiles = readdirSync(__dirname).filter(
    (f) => f.endsWith('.js') && !f.includes('migration.service'),
  );
  return migrationFiles.map((f) => join(__dirname, f));
};

@Injectable()
export class MigrationRunner implements OnModuleInit {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      ...databaseConfig,
      entities: [__dirname + '/../../entities/*.entity.js'],
      migrations: getMigrations(),
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
    await this.runPendingMigrations();
  }

  async runPendingMigrations(): Promise<void> {
    try {
      const hasMigrations = await this.dataSource.showMigrations();
      let migrations;
      if (hasMigrations) {
        migrations = await this.dataSource.runMigrations();
      }
      if (migrations?.length > 0) {
        console.log(
          `[MigrationRunner] Ran ${migrations.length} migration(s):`,
          migrations.map((m) => m.name),
        );
      } else {
        console.log('[MigrationRunner] No pending migrations');
      }
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }
}
