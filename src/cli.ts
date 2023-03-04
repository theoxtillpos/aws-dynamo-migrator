#!/usr/bin/env node

import figlet from 'figlet';
import path from 'path';
import yargs, { ArgumentsCamelCase } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getAllMigrations } from './data-connector';
import { applyMigration, rollbackMigration } from './migration';
import { ImportedModule, Migration } from './types';
import {
  checkAndLoadMigration,
  getConfig,
  isValidMigration,
  listAllFiles,
  loadAllModules,
} from './utils';

async function applyAllMigrations() {
  const config = getConfig();

  // exclusively use path.join instead of path.resolve to for relative path instead of absolute
  const migrationPath = path.join('./', config.migrationsPath);
  const allFiles = listAllFiles(migrationPath, config.exclude);
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
}

async function applySingleMigration(
  argv: ArgumentsCamelCase<{ path: string }>,
) {
  const module = await checkAndLoadMigration(argv.path);

  console.log(`Applying migration at "${argv.path}"`);
  await applyMigration(module);
}

async function rollbackSingleMigration(
  argv: ArgumentsCamelCase<{ path: string }>,
) {
  const module = await checkAndLoadMigration(argv.path);

  console.log(`Rolling back migration at "${argv.path}"`);
  await rollbackMigration(module);
}

(function main(argv) {
  // print out script name beforeward
  console.log(figlet.textSync('Migrator'), '\n');

  // handle all commands with yargs
  yargs(hideBin(argv))
    .scriptName('migrator')
    .usage('Simple migration management framework')
    .command(
      ['$0', 'run'],
      'Detect and apply all migrations',
      yargs => yargs,
      applyAllMigrations,
    )
    .command(
      'apply <path>',
      'Apply a specific migration from path',
      yargs => {
        return yargs.positional('path', {
          type: 'string',
          desc: 'Path to the migration file',
        });
      },
      applySingleMigration,
    )
    .command(
      'rollback <path>',
      'Rollback a specific migration from path',
      yargs =>
        yargs.positional('path', {
          type: 'string',
          desc: 'Path to the migration file',
        }),
      rollbackSingleMigration,
    ).argv;
})(process.argv);
