import fs from 'fs';
import path from 'path';
import config from 'interpret';
import rechoir from 'rechoir';
import { ImportedModule, Migration, MigratorConfig } from './types';
import defaultConfig from './config.default.json';

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
  const config: MigratorConfig = Object.assign(
    {},
    defaultConfig,
  ) as MigratorConfig;

  config.dynamoDB.tableName =
    process.env.DYNAMODB_TABLE_NAME ?? config.dynamoDB.tableName;

  return config;
}

/**
 * Check if the file in path is a js or ts file
 * @param path file path to check
 * @returns true if path is either a js or ts file
 */
export function isValidExtensions(path: string): boolean {
  const regex = /\.[tj]s$/i;
  return regex.test(path);
}

/**
 * Load all modules from the provided paths
 * @param paths paths to load modules from
 * @returns loaded modules
 */
export async function loadAllModules(
  paths: string[],
): Promise<ImportedModule[]> {
  // use Promise.allSettled and ignore failure
  const allModules = await Promise.allSettled<ImportedModule>(
    paths.filter(isValidExtensions).map(async file => {
      // convert to absolute path for import to work
      const absolutePath = path.resolve(file);
      rechoir.prepare(config.jsVariants, absolutePath);
      const module = await import(absolutePath);

      return {
        path: file, // returned path is relative one, for record keeping purpose
        module: module.default, // only consider the default export
      };
    }),
  );

  const errors = allModules
    .filter(module => module.status !== 'fulfilled')
    .map(error => (error as PromiseRejectedResult).reason);
  if (errors.length) {
    console.warn('Failed to import the following modules:', errors);
  }

  // return only fulfilled modules
  return allModules
    .filter(module => module.status === 'fulfilled')
    .map(module => (module as PromiseFulfilledResult<ImportedModule>).value);
}

/**
 * Check if a imported module is a valid Migration
 * @param module module to check
 * @returns module is a valid Migration
 */
export function isValidMigration(
  importedModule: ImportedModule,
): importedModule is ImportedModule<typeof Migration> {
  // Note: a valid migration is a subclass of Migration class
  return importedModule?.module?.prototype instanceof Migration;
}
