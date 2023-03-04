import fs from 'fs';
import path from 'path';
import config from 'interpret';
import rechoir from 'rechoir';
import glob from 'glob';
import { ImportedModule, Migration, MigratorConfig } from './types';
import defaultConfig from './config.default.json';

/**
 * Recursively list all js and ts files inside a folder and sub-folders
 * @param dir path to the directory
 */
export function listAllFiles(dir: string, exclude?: string[]): string[] {
  return glob.globSync([`${dir}/**/*.ts`, `${dir}/**/*.js`], {
    ignore: exclude,
  });
}

/**
 * Get the configurations to run migrator
 * @returns combined config
 */
export function getConfig(): MigratorConfig {
  let userConfig: Partial<MigratorConfig> = {};

  const userConfigPath = path.resolve(process.cwd(), 'migrator.config.json');
  if (fs.existsSync(userConfigPath)) {
    // read user's config if exists
    userConfig = JSON.parse(fs.readFileSync(userConfigPath).toString());
  }

  const config: MigratorConfig = Object.assign(
    {},
    defaultConfig,
    userConfig,
  ) as MigratorConfig;

  // override with env vars if exists
  config.dynamoDB.tableName =
    process.env.DYNAMODB_TABLE_NAME ?? config.dynamoDB.tableName;
  config.dynamoDB.region = process.env.AWS_REGION ?? config.dynamoDB.region;
  config.dynamoDB.endpoint =
    process.env.DYANMODB_TABLE_ENDPOINT ?? config.dynamoDB.endpoint;

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
    paths.map(async file => {
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

/**
 * Check and load migration module
 * @param filePath path to check
 * @returns migration module if valid
 */
export async function checkAndLoadMigration(filePath: string) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath) || !isValidExtensions(absolutePath)) {
    throw new Error(`"${filePath}" is not a valid file!`);
  }

  const modules = await loadAllModules([filePath]);
  if (!modules.length || !isValidMigration(modules[0])) {
    throw new Error(`"${filePath}" is not a valid migration!`);
  }

  return modules[0] as ImportedModule<typeof Migration>;
}
