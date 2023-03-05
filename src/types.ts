export abstract class Migration {
  static async up(): Promise<void> {
    throw new Error('Up migration not implemented');
  }

  static async down(): Promise<void> {
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
  exclude?: string[];
  dynamoDB: {
    tableName: string;
    region?: string;
    endpoint?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ImportedModule<T = any> {
  path: string;
  module: T;
}
