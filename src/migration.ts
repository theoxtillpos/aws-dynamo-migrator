import { getMigrationByPath, putMigration } from './data-connector';
import {
  ImportedModule,
  Migration,
  MigrationModel,
  MigrationStatus,
} from './types';

export async function applyMigration(
  migration: ImportedModule<typeof Migration>,
) {
  let status = MigrationStatus.SUCCESS;
  try {
    migration.module.up();
  } catch (error) {
    console.error(`Error applying migration "${migration.path}":`, error);
    status = MigrationStatus.FAILURE;
  } finally {
    const migrationModel: MigrationModel = {
      pk: 'migration#all',
      sk: `path#${migration.path}`,
      path: migration.path,
      ranAt: Date.now(),
      status,
    };

    return putMigration(migrationModel);
  }
}

export async function rollBackMigration(
  migration: ImportedModule<typeof Migration>,
) {
  const appliedMigration = await getMigrationByPath(migration.path);

  if (
    !appliedMigration ||
    appliedMigration.status === MigrationStatus.ROLLBACKED
  ) {
    throw new Error(
      'Migration has not been applied or has already been rollbacked!',
    );
  }

  let status = MigrationStatus.ROLLBACKED;
  try {
    migration.module.down();
  } catch (error) {
    console.error(`Error rolling back migration "${migration.path}":`, error);
    status = MigrationStatus.FAILURE;
  } finally {
    return putMigration({
      ...appliedMigration,
      status,
      rollBackedAt: Date.now(),
    });
  }
}