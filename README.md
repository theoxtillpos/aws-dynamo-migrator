# aws-dynamo-migrator

[![codecov](https://codecov.io/gh/theoxtillpos/aws-dynamo-migrator/branch/main/graph/badge.svg?token=60ILZZYZ6R)](https://codecov.io/gh/theoxtillpos/aws-dynamo-migrator)
[![CD - Publish package](https://github.com/theoxtillpos/aws-dynamo-migrator/actions/workflows/cd-publish-package.yml/badge.svg)](https://github.com/theoxtillpos/aws-dynamo-migrator/actions/workflows/cd-publish-package.yml)

A simple framework to manage DynamoDB migrations as code.

It keeps track of all the applied (or rollbacked) migrations, so the users can easily tell if a migration has been applied or not by looking at the DynamoDB records.

With each migrations, you can go crazy with the coding, as long as it follows the [Migration](https://github.com/theoxtillpos/aws-dynamo-migrator/blob/5b7827716b9f2dfb1bc0b45f1f93b346fccd2f62/src/types.ts#L1) interface. Supported extensions are _typescript (.ts)_ and _javascript (.js)_.

## Configuration

To let the migrator know what is the configuration to run with, you can create a file named `migrator.config.json` (optional, if the file does not exist, a default configuration will be used) at the root of your project with the following info:

```json
{
  "migrationsPath": "migrations", // optional, the path that contains all your migration implementations, default to "migrations"
  "exclude": [], // optional, glob patterns of what to exclude from migrations scanning
  "dynamoDB": {
    "tableName": "some-table-name", // required, the dynamoDB table to point to, can be overridden with DYNAMODB_TABLE_NAME env
    "region": "valid-aws-region", // optional, the AWS region of the dynamoDB table, can be overridden with AWS_REGION env
    "endpoint": "valid-dynamo-db-endpoint" // optional, custom endpoint for dynamoDB table, can be overridden with DYNAMODB_TABLE_ENDPOINT env
  }
}
```

## Trigger the migrations

For triggering all the migrations, simply just open a terminal session and type in:

If the package is installed globally:

```bash
migrator
```

If it is a local install:

```bash
npx migrator
```

This will scan through all the migrations in the configurated migrations folder, run it, then create records in the dynamoDB table to keep track of the timestamps and statuses. Next time the command `migrator` is ran, only the ones that haven't been applied will be triggered.

You also have the ability to apply or rollback a individual migration with commands `migrator apply <path>` or `migrator rollback <path>`. To get more details, run `migrator --help`.
