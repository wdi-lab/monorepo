/**
 * Shared testcontainer setup for DynamoDB Local
 * Used across multiple services for integration testing
 */

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
} from '@aws-sdk/client-dynamodb';

export interface SetupConfig {
  tables: CreateTableCommandInput[];
}

export interface SetupResult {
  endpoint: string;
  container: StartedTestContainer;
}

let container: StartedTestContainer | undefined;

/**
 * Starts a DynamoDB Local container and creates the specified tables
 * Sets the DYNAMODB_LOCAL_ENDPOINT environment variable for AWS SDK clients
 *
 * @param config - Configuration specifying which tables to create
 * @returns Object containing the endpoint URL and container instance
 */
export async function setup(config: SetupConfig): Promise<SetupResult> {
  const defaultArguments = ['-inMemory', '-disableTelemetry'];
  const allArguments = [...new Set([...defaultArguments])];

  // Start DynamoDB Local container
  container = await new GenericContainer(
    'public.ecr.aws/aws-dynamodb-local/aws-dynamodb-local:latest'
  )
    .withCommand(['-jar', 'DynamoDBLocal.jar', ...allArguments])
    .withAutoRemove(true)
    .withExposedPorts(8000)
    .withWaitStrategy(Wait.forHttp('/', 8000).forStatusCode(400))
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(8000);
  const endpoint = `http://${host}:${port}`;

  // Set environment variable for AWS SDK to use local DynamoDB
  process.env.DYNAMODB_LOCAL_ENDPOINT = endpoint;

  // Create DynamoDB client for table creation
  const dynamoDb = new DynamoDBClient({
    endpoint,
    region: 'local-env',
    credentials: {
      accessKeyId: 'fakeMyKeyId',
      secretAccessKey: 'fakeSecretAccessKey',
    },
  });

  // Create all specified tables
  for (const tableConfig of config.tables) {
    await dynamoDb.send(new CreateTableCommand(tableConfig));
  }

  return {
    endpoint,
    container,
  };
}

/**
 * Stops the DynamoDB Local container and cleans up resources
 */
export async function teardown(): Promise<void> {
  await container?.stop();
}
