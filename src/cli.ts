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

(async function main() {
  const argv = yargs(hideBin(process.argv)).parseSync();

  const config = getConfig();

  const allFiles = listAllFiles(path.resolve('./', config.migrationsPath));
  console.log(
    `Found ${allFiles.length} files inside the migrations folder`,
    allFiles,
  );

  const allModules = await loadAllModules(allFiles);
  console.log(`Successfully load ${allModules.length} typescript modules`);

  const allMigrations = allModules.filter(isValidMigration);
  console.log(`Found ${allMigrations.length} valid migrations implementation`);
})();
