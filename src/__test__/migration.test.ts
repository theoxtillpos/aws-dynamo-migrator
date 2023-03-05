import { faker } from '@faker-js/faker';
import MockMigration from './mocks/valid-migration';
import HelloMigration from './mocks/implemented-migration';
import * as dataConnectors from '../data-connector';
import { applyMigration, rollbackMigration } from '../migration';
import { MigrationStatus } from '../types';

const putMigrationMock = jest
  .fn()
  .mockImplementation(model => Promise.resolve(model));
jest.spyOn(dataConnectors, 'putMigration').mockImplementation(putMigrationMock);
const getMigrationMock = jest.fn();
jest
  .spyOn(dataConnectors, 'getMigrationByPath')
  .mockImplementation(getMigrationMock);

const mockPath = faker.system.filePath();
const now = new Date().getTime();
jest.spyOn(Date, 'now').mockReturnValue(now);
jest.spyOn(console, 'error');

const mockMigration = {
  pk: 'migration#all',
  sk: `path#${mockPath}`,
  path: mockPath,
  ransAt: now,
  status: MigrationStatus.SUCCESS,
};

describe('applyMigration', () => {
  it('should trigger migration up and update status as success', async () => {
    const result = await applyMigration({
      path: mockPath,
      module: HelloMigration,
    });

    expect(putMigrationMock).toBeCalledTimes(1);
    expect(result).toEqual({
      pk: 'migration#all',
      sk: `path#${mockPath}`,
      path: mockPath,
      ranAt: Date.now(),
      status: MigrationStatus.SUCCESS,
    });
  });

  it('should update status as failure if migration invocation fails', async () => {
    const result = await applyMigration({
      path: mockPath,
      module: MockMigration,
    });

    expect(putMigrationMock).toBeCalledTimes(1);
    expect(result).toEqual({
      pk: 'migration#all',
      sk: `path#${mockPath}`,
      path: mockPath,
      ranAt: Date.now(),
      status: MigrationStatus.FAILURE,
    });
    expect(console.error).toBeCalledWith(
      expect.stringContaining('Error applying migration'),
      expect.anything(),
    );
  });
});

describe('rollbackMigration', () => {
  it('should rollback migration and update status as rollbacked', async () => {
    getMigrationMock.mockResolvedValue(mockMigration);

    const result = await rollbackMigration({
      path: mockPath,
      module: HelloMigration,
    });

    expect(getMigrationMock).toBeCalledTimes(1);
    expect(getMigrationMock).toBeCalledWith(mockPath);

    expect(putMigrationMock).toBeCalledTimes(1);
    expect(result).toEqual({
      ...mockMigration,
      status: MigrationStatus.ROLLBACKED,
      rollbackedAt: Date.now(),
    });
  });

  it('should update status as failure if rollback invocation fails', async () => {
    getMigrationMock.mockResolvedValue(mockMigration);

    const result = await rollbackMigration({
      path: mockPath,
      module: MockMigration,
    });

    expect(putMigrationMock).toBeCalledTimes(1);
    expect(result).toEqual({
      ...mockMigration,
      status: MigrationStatus.FAILURE,
      rollbackedAt: Date.now(),
    });
    expect(console.error).toBeCalledTimes(1);
    expect(console.error).toBeCalledWith(
      expect.stringContaining('Error rolling back migration'),
      expect.anything(),
    );
  });

  it('should throw error if migration is not found from DB', async () => {
    getMigrationMock.mockResolvedValue(undefined);

    await expect(
      rollbackMigration({
        path: mockPath,
        module: MockMigration,
      }),
    ).rejects.toThrowError(
      'Migration has not been applied or has already been rollbacked!',
    );

    expect(putMigrationMock).not.toBeCalled();
  });

  it('should throw error if applied migration status is rollbacked', async () => {
    getMigrationMock.mockResolvedValue({
      ...mockMigration,
      status: MigrationStatus.ROLLBACKED,
    });

    await expect(
      rollbackMigration({
        path: mockPath,
        module: MockMigration,
      }),
    ).rejects.toThrowError(
      'Migration has not been applied or has already been rollbacked!',
    );

    expect(putMigrationMock).not.toBeCalled();
  });
});
