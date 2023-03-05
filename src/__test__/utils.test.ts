import { faker } from '@faker-js/faker';
import {
  checkAndLoadMigration,
  getConfig,
  isValidExtensions,
  isValidMigration,
  listAllFiles,
  loadAllModules,
} from '../utils';
import defaultConfig from '../config.default.json';
import fs from 'fs';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');

  return {
    esModule: true,
    ...original,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

describe('isValidExtensions', () => {
  it('should return true for ts or js files path', () => {
    expect(isValidExtensions('example/path/something.js')).toBe(true);
    expect(isValidExtensions('example/path/something.ts')).toBe(true);
  });

  it('should return false for any other extensions', () => {
    const types = Array(5).map(item => {
      let path: string;
      do {
        path = faker.system.filePath();
      } while (path.match(/\.[tj]s$/)); // ensure it does not fake a js or ts file
      return path;
    });
    types.forEach(type => {
      expect(isValidExtensions(type)).toBe(false);
    });
  });
});

describe('isValidMigration', () => {
  it('should return true if module is a implementation of Migration', async () => {
    const module = (await import('./mocks/valid-migration')).default;

    expect(isValidMigration({ path: faker.system.filePath(), module })).toBe(
      true,
    );
  });

  it('should return false if module is not a implementation of Migration', async () => {
    const module = (await import('./mocks/invalid-migration')).default;

    expect(isValidMigration({ path: faker.system.filePath(), module })).toBe(
      false,
    );
  });
});

describe('listAllFiles', () => {
  it('should list all files in a folder', () => {
    expect(listAllFiles('src/__test__/mocks')).toEqual(
      expect.arrayContaining([
        'src/__test__/mocks/valid-migration.ts',
        'src/__test__/mocks/invalid-migration.ts',
      ]),
    );
  });

  it('should return empty for invalid path', () => {
    expect(listAllFiles('invalid')).toEqual([]);
  });

  it('should ignore excluded path', () => {
    expect(listAllFiles('src/__test__/mocks', ['**/invalid-*'])).toEqual([
      'src/__test__/mocks/valid-migration.ts',
    ]);
  });
});

describe('getConfig', () => {
  it('should return default config if no user config file exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(getConfig()).toEqual(defaultConfig);
  });

  it('should combine default and user config if exists', () => {
    const userConfig = {
      migrationsPath: 'test',
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(userConfig));
    expect(getConfig()).toEqual(Object.assign({}, defaultConfig, userConfig));
  });

  it('should override properties with env vars', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'test-region';
    process.env.DYNAMODB_TABLE_ENDPOINT = 'test-endpoint';

    expect(getConfig()).toEqual({
      ...defaultConfig,
      dynamoDB: {
        tableName: 'test-table',
        region: 'test-region',
        endpoint: 'test-endpoint',
      },
    });
  });
});

describe('loadAllModules', () => {
  it('should be able to dynamically load modules', async () => {
    const result = await loadAllModules([
      'src/__test__/mocks/valid-migration.ts',
      'src/__test__/mocks/invalid-migration.ts',
    ]);

    expect(result).toHaveLength(2);
    // successfully import modules
    expect(result).toEqual(
      expect.arrayContaining([
        {
          path: 'src/__test__/mocks/valid-migration.ts',
          module: expect.anything(),
        },
        {
          path: 'src/__test__/mocks/invalid-migration.ts',
          module: expect.anything(),
        },
      ]),
    );
  });

  it('should throw out warning for fail import', async () => {
    jest.spyOn(console, 'warn').mockImplementation();

    const result = await loadAllModules(['non-exists.ts']);

    expect(result).toEqual([]);
    expect(console.warn).toBeCalledTimes(1);
    expect(console.warn).toBeCalledWith(
      'Failed to import the following modules:',
      expect.anything(),
    );
  });
});

describe('checkAndLoadMigration', () => {
  it('should throw error if provided path is not exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const file = faker.system.filePath();
    await expect(checkAndLoadMigration(file)).rejects.toThrow(
      new Error(`"${file}" is not a valid file!`),
    );
  });

  it('should throw error if provided path is not a valid migration', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const file = 'src/__test__/mocks/invalid-migration.ts';
    await expect(checkAndLoadMigration(file)).rejects.toThrow(
      new Error(`"${file}" is not a valid migration!`),
    );
  });

  it('should return imported module if provided path is valid', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const file = 'src/__test__/mocks/valid-migration.ts';
    await expect(checkAndLoadMigration(file)).resolves.toEqual({
      path: file,
      module: expect.anything(),
    });
  });
});
