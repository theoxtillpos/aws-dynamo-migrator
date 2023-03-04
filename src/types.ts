export abstract class Migration {
  static up(): void {
    throw new Error('Up migration not implemented');
  }

  static down(): void {
    throw new Error('Down migration not Implemented');
  }
}

export enum MigrationStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  ROLLBACKED = 'ROLLBACKED',
}

export interface MigrationModel {
  pk: string;
  sk: string;
  path: string;
  ranAt: number;
  rollBackedAt?: number;
  status: MigrationStatus;
}

export interface MigratorConfig {
  migrationsPath: string;
  dynamoDB: {
    tableName: string;
    region?: string;
    endpoint?: string;
  };
}

export interface ImportedModule<T = any> {
  path: string;
  module: T;
}
