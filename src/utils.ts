import fs from 'fs';
import path from 'path';
import config from 'interpret';
import rechoir from 'rechoir';
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
export async function loadAllModules(paths: string[]) {
  // use Promise.allSettled and ignore failure
  const allModules = await Promise.allSettled(
    paths.filter(isValidExtensions).map(file => {
      rechoir.prepare(config.jsVariants, file);
      return import(file);
    }),
  );

  // return only fulfilled modules
  return allModules
    .filter(module => module.status === 'fulfilled')
    .map(module => (module as any).value);
}

/**
 * Check if a imported module is a valid Migration
 * @param module module to check
 * @returns module is a valid Migration
 */
export function isValidMigration(module: any): module is Migration {
  // Note: a valid migration is a default export that is a superclass of Migration class
  return module?.default?.prototype instanceof Migration;
}
