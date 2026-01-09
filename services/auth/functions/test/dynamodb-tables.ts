import type { CreateTableCommandInput } from '@aws-sdk/client-dynamodb';

const magicLinksTable = {
  TableName: 'MagicLinks',
  KeySchema: [
    {
      AttributeName: 'userNameHash',
      KeyType: 'HASH',
    },
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'userNameHash',
      AttributeType: 'B',
    },
  ],
  BillingMode: 'PAY_PER_REQUEST',
} satisfies CreateTableCommandInput;

/**
 * Main table for ElectroDB entities (Users, etc.)
 *
 * Matches the table structure defined in services/auth/infra/Main.ts:
 * - Primary key: pk (partition), sk (sort)
 * - GSI1: gsi1pk (partition), gsi1sk (sort)
 */
const mainTable = {
  TableName: 'MainTable',
  KeySchema: [
    {
      AttributeName: 'pk',
      KeyType: 'HASH',
    },
    {
      AttributeName: 'sk',
      KeyType: 'RANGE',
    },
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'pk',
      AttributeType: 'S',
    },
    {
      AttributeName: 'sk',
      AttributeType: 'S',
    },
    {
      AttributeName: 'gsi1pk',
      AttributeType: 'S',
    },
    {
      AttributeName: 'gsi1sk',
      AttributeType: 'S',
    },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'gsi1',
      KeySchema: [
        {
          AttributeName: 'gsi1pk',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'gsi1sk',
          KeyType: 'RANGE',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
    },
  ],
  BillingMode: 'PAY_PER_REQUEST',
} satisfies CreateTableCommandInput;

export const tables = { magicLinksTable, mainTable };
