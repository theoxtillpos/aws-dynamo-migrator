import fs from 'fs';
import path from 'path';
import { dynamicImport } from 'tsimportlib';
import { Migration, MigratorConfig } from './types';

/**
 * Recursively list all find inside a folder and sub-folders
 * @param dir path to the directory
 */
export function listAllFiles(dir: string): string[] {
  const allFiles = fs.readdirSync(dir);
  const nonDirFiles: string[] = [];

  allFiles.forEach(fileName => {
    const filePath = path.join(dir, fileName);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      // if the path is a directory, recursively list all files inside
      nonDirFiles.push(...listAllFiles(filePath));
    } else {
      nonDirFiles.push(filePath);
    }
  });

  return nonDirFiles;
}

/**
 * Get the configurations to run migrator
 * @returns combined config
 */
export function getConfig(): MigratorConfig {
  // TODO: dynamic configuration
  return {
    migrationsPath: 'migrations',
  };
}

export function isTypescriptFile(path: string): boolean {
  const regex = /\.ts$/i;
  return regex.test(path);
}

/**
 * Load all modules from the provided paths
 * @param paths paths to load modules from
 * @returns loaded modules
 */
export async function loadAllModules(paths: string[]) {
  //   // use Promise.allSettled and ignore failure
  //   const allModules = await Promise.allSettled(
  //     paths.filter(isTypescriptFile).map(path => import(path)),
  //   );

  //   // return only fulfilled modules
  //   return allModules
  //     .filter(module => module.status === 'fulfilled')
  //     .map(module => (module as any).value);
  const allModules = await Promise.all(
    paths.filter(isTypescriptFile).map(file => import(file)),
  );

  return allModules;
}

export function isValidMigration(module: any): module is Migration {
  return module instanceof Migration;
}
