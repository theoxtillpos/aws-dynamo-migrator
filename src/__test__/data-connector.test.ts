import { DynamoHelper } from '@hitz-group/dynamo-helper';
import { faker } from '@faker-js/faker';
import {
  getAllMigrations,
  getMigrationByPath,
  putMigration,
} from '../data-connector';
import { MigrationModel } from '../types';

jest.mock('@hitz-group/dynamo-helper', () => {
  const original = jest.requireActual('@hitz-group/dynamo-helper');
  const testClient = {
    query: jest.fn().mockReturnThis(),
    getItem: jest.fn().mockReturnThis(),
    putItem: jest.fn().mockReturnThis(),
  };
  return {
    __esModule: true,
    ...original,
    DynamoHelper: class DynamoHelper {
      constructor() {
        return testClient;
      }
    },
  };
});

const testClient = new DynamoHelper({} as never);

describe('getAllMigrations', () => {
  it('should throw error on query failure', async () => {
    jest
      .spyOn(testClient, 'query')
      .mockRejectedValue(new Error('something went wrond'));

    await expect(getAllMigrations()).rejects.toThrowError();
  });

  it('should return records from query', async () => {
    jest
      .spyOn(testClient, 'query')
      .mockResolvedValue([
        { pk: 'migration#all', sk: 'path#test', path: 'test' },
      ]);

    const result = await getAllMigrations();

    expect(result).toHaveLength(1);
    expect(testClient.query).toBeCalledTimes(1);
    expect(testClient.query).toBeCalledWith({
      where: {
        pk: 'migration#all',
        sk: {
          beginsWith: 'path#',
        },
      },
    });
  });
});

describe('getMigrationByPath', () => {
  it('should throw error on query failure', async () => {
    jest
      .spyOn(testClient, 'getItem')
      .mockRejectedValue(new Error('something went wrong'));

    await expect(
      getMigrationByPath(faker.system.filePath()),
    ).rejects.toThrowError();
  });

  it('should get and return item using path as key', async () => {
    const path = faker.system.filePath();

    jest
      .spyOn(testClient, 'getItem')
      .mockResolvedValue({ pk: 'migration#all', sk: `path#${path}` });

    expect(await getMigrationByPath(path)).toEqual({
      pk: 'migration#all',
      sk: `path#${path}`,
    });
    expect(testClient.getItem).toBeCalledTimes(1);
  });
});

describe('putMigration', () => {
  it('should throw error on query failure', async () => {
    jest
      .spyOn(testClient, 'putItem')
      .mockRejectedValue(new Error('something went wrong'));

    await expect(putMigration({} as MigrationModel)).rejects.toThrowError();
  });

  it('should throw response error', async () => {
    jest.spyOn(testClient, 'putItem').mockResolvedValue({
      $response: {
        error: new Error('something went wrong'),
      } as never,
    });

    await expect(putMigration({} as MigrationModel)).rejects.toThrow();
  });

  it('should return model on successful query', async () => {
    jest.spyOn(testClient, 'putItem').mockImplementation(
      model =>
        Promise.resolve({
          $response: {
            data: model,
          },
        }) as never,
    );

    expect(
      await putMigration({ pk: 'test', sk: 'test' } as MigrationModel),
    ).toEqual({
      pk: 'test',
      sk: 'test',
    });
  });
});
