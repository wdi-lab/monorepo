/**
 * Table configuration for ElectroDB entities
 *
 * Provides table name and index configuration that matches the DynamoDB table
 * created by the auth service infrastructure (infra/Main.ts).
 */

import { GlobalTable } from '@lib/sst-constructs/node/global-table';

/**
 * Get the main table name from SST bindings.
 *
 * The table is bound to Lambda functions via SST constructs.
 * SST sets environment variables in the format: SST_GlobalTable_tableName_<tableId>
 */
export function getMainTableName(): string {
  return GlobalTable.mainTable.tableName;
}

/**
 * Table configuration matching the infrastructure definition.
 *
 * This configuration maps to the DynamoDB table structure defined in
 * services/auth/infra/Main.ts:
 *
 * - Primary key: pk (partition), sk (sort)
 * - GSI1: gsi1pk (partition), gsi1sk (sort) - index name: gsi1
 */
export const tableConfig = {
  /**
   * Primary key field name
   */
  pk: 'pk',

  /**
   * Sort key field name
   */
  sk: 'sk',

  /**
   * GSI1 partition key field name
   */
  gsi1pk: 'gsi1pk',

  /**
   * GSI1 sort key field name
   */
  gsi1sk: 'gsi1sk',

  /**
   * GSI1 index name
   */
  gsi1IndexName: 'gsi1',
} as const;
