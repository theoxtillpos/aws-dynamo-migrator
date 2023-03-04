#!/usr/bin/env node

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import {
  getConfig,
  isValidMigration,
  listAllFiles,
  loadAllModules,
} from './utils';
import { ImportedModule, Migration } from './types';
import { getAllMigrations } from './data-connector';
import { applyMigration } from './migration';

(async function main(argv) {
  // TODO: do something with argv
  const parsedArgs = yargs(hideBin(argv)).parseSync();

  const config = getConfig();

  // exclusively use path.join instead of path.resolve to for relative path instead of absolute
  const migrationPath = path.join('./', config.migrationsPath);
  const allFiles = listAllFiles(migrationPath);
  console.log(
    `Found ${allFiles.length} files inside the migrations folder`,
    allFiles,
  );

  const allModules = await loadAllModules(allFiles);
  console.log(`Successfully load ${allModules.length} modules`);

  const allMigrationModules: ImportedModule<typeof Migration>[] =
    allModules.filter(importedModule => isValidMigration(importedModule));
  console.log(
    `Found ${allMigrationModules.length} valid migration implementations`,
  );

  const allMigrations = await getAllMigrations();
  const allMigratedPaths = allMigrations.map(migration => migration.path);
  const unApplied = allMigrationModules.filter(
    migration => !allMigratedPaths.includes(migration.path),
  ); // exclude migrated records

  const results = [];
  for (const migration of unApplied) {
    console.log(`Applying migration "${migration.path}"`);
    results.push(await applyMigration(migration));
  }

  // TODO: handle migration results
  console.log(`Successfully applied ${unApplied.length} migrations`);
})(process.argv);
