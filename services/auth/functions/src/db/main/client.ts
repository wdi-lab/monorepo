/**
 * DynamoDB client configuration for ElectroDB entities
 *
 * Provides a configured DynamoDB client with support for local DynamoDB
 * during testing and development.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

/**
 * Create a DynamoDB client configured for the current environment.
 *
 * When DYNAMODB_LOCAL_ENDPOINT is set, the client connects to local DynamoDB.
 * Otherwise, it uses the default AWS configuration.
 */
export function createDynamoDBClient(): DynamoDBClient {
  if (process.env.DYNAMODB_LOCAL_ENDPOINT) {
    return new DynamoDBClient({
      endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT,
      region: 'local-env',
      credentials: {
        accessKeyId: 'fakeMyKeyId',
        secretAccessKey: 'fakeSecretAccessKey',
      },
    });
  }

  return new DynamoDBClient({});
}

/**
 * Singleton DynamoDB client instance.
 *
 * Reused across all ElectroDB entities to minimize connection overhead.
 */
export const dynamoDBClient = createDynamoDBClient();
