import { DynamoHelper } from '@hitz-group/dynamo-helper';
import { MigrationModel } from './types';
import { getConfig } from './utils';

const config = getConfig();

const dynamo = new DynamoHelper(
  {
    name: config.dynamoDB.tableName,
    indexes: {
      default: {
        partitionKeyName: 'pk',
        sortKeyName: 'sk',
      },
    },
  },
  config.dynamoDB.region,
  config.dynamoDB.endpoint,
);

export function getAllMigrations(): Promise<MigrationModel[]> {
  // TODO: make this customizable
  return dynamo.query({
    where: {
      pk: 'migration#all',
      sk: {
        beginsWith: 'path#',
      },
    },
  });
}

export function getMigrationByPath(path: string): Promise<MigrationModel> {
  return dynamo.getItem({
    pk: 'migration#all',
    sk: `path#${path}`,
  });
}

export async function putMigration(model: MigrationModel) {
  const result = await dynamo.putItem(model);

  return result.$response.error ?? model;
}
