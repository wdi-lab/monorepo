import {
  setup as setupDynamoDb,
  teardown as teardownDynamoDb,
} from '@test/local-dynamodb';
import { tables } from './dynamodb-tables.ts';

export async function setup() {
  await setupDynamoDb({
    tables: [tables.magicLinksTable, tables.mainTable],
  });
  process.env.DYNAMODB_SECRETS_TABLE = tables.magicLinksTable.TableName;
  // SST GlobalTable binding format: SST_GlobalTable_tableName_<tableId>
  process.env.SST_GlobalTable_tableName_mainTable = tables.mainTable.TableName;
}

export async function teardown() {
  await teardownDynamoDb();
}
