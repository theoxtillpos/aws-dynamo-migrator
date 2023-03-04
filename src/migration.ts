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
  }

  const migrationModel: MigrationModel = {
    pk: 'migration#all',
    sk: `path#${migration.path}`,
    path: migration.path,
    ranAt: Date.now(),
    status,
  };

  await putMigration(migrationModel);

  return migrationModel;
}

export async function rollbackMigration(
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
  }

  const migrationModel = {
    ...appliedMigration,
    status,
    rollBackedAt: Date.now(),
  };

  await putMigration(migrationModel);

  return migrationModel;
}
