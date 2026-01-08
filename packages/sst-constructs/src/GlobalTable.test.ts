import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { initProject } from 'sst/project.js';
import { App, Function, getStack, StackContext } from 'sst/constructs';
import { GlobalTable } from './GlobalTable.ts';

// Mock the sst-helpers import
vi.mock('@lib/sst-helpers', () => ({
  removalPolicy: {
    retainForPermanentStage: vi.fn(() => RemovalPolicy.DESTROY),
  },
}));

describe('GlobalTable', () => {
  beforeAll(async () => {
    await initProject({});
  });

  describe('constructor', () => {
    it('should create a global table with basic configuration', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: {
            pk: 'string',
            sk: 'string',
          },
          primaryIndex: { partitionKey: 'pk', sortKey: 'sk' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.resourceCountIs('AWS::DynamoDB::GlobalTable', 1);
      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          TableName: Match.stringLikeRegexp('.*-TestTable'),
          KeySchema: Match.arrayWith([
            Match.objectLike({ AttributeName: 'pk', KeyType: 'HASH' }),
            Match.objectLike({ AttributeName: 'sk', KeyType: 'RANGE' }),
          ]),
          AttributeDefinitions: Match.arrayWith([
            Match.objectLike({ AttributeName: 'pk', AttributeType: 'S' }),
            Match.objectLike({ AttributeName: 'sk', AttributeType: 'S' }),
          ]),
          BillingMode: 'PAY_PER_REQUEST',
        })
      );
    });

    it('should create a table with partition key only', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: {
            pk: 'string',
          },
          primaryIndex: { partitionKey: 'pk' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          KeySchema: [
            Match.objectLike({ AttributeName: 'pk', KeyType: 'HASH' }),
          ],
        })
      );
    });

    it('should support different field types', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: {
            stringField: 'string',
            numberField: 'number',
            binaryField: 'binary',
          },
          primaryIndex: { partitionKey: 'stringField', sortKey: 'numberField' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          AttributeDefinitions: Match.arrayWith([
            Match.objectLike({
              AttributeName: 'stringField',
              AttributeType: 'S',
            }),
            Match.objectLike({
              AttributeName: 'numberField',
              AttributeType: 'N',
            }),
          ]),
        })
      );
    });

    it('should allow overriding table name', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          tableName: 'my-custom-table-name',
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          TableName: 'my-custom-table-name',
        })
      );
    });

    it('should enable point-in-time recovery by default', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          Replicas: Match.arrayWith([
            Match.objectLike({
              PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: true,
              },
            }),
          ]),
        })
      );
    });

    it('should allow disabling point-in-time recovery', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
          pointInTimeRecovery: false,
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          Replicas: Match.arrayWith([
            Match.objectLike({
              PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: false,
              },
            }),
          ]),
        })
      );
    });
  });

  describe('timeToLiveAttribute', () => {
    it('should configure TTL attribute', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
          timeToLiveAttribute: 'expiresAt',
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          TimeToLiveSpecification: {
            AttributeName: 'expiresAt',
            Enabled: true,
          },
        })
      );
    });
  });

  describe('stream', () => {
    it('should configure DynamoDB stream', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
          stream: 'new_and_old_images',
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          StreamSpecification: {
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
        })
      );
    });
  });

  describe('globalIndexes', () => {
    it('should create global secondary indexes', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: {
            pk: 'string',
            sk: 'string',
            gsi1pk: 'string',
            gsi1sk: 'number',
          },
          primaryIndex: { partitionKey: 'pk', sortKey: 'sk' },
          globalIndexes: {
            GSI1: { partitionKey: 'gsi1pk', sortKey: 'gsi1sk' },
          },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          GlobalSecondaryIndexes: Match.arrayWith([
            Match.objectLike({
              IndexName: 'GSI1',
              KeySchema: Match.arrayWith([
                Match.objectLike({ AttributeName: 'gsi1pk', KeyType: 'HASH' }),
                Match.objectLike({ AttributeName: 'gsi1sk', KeyType: 'RANGE' }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should support GSI with keys_only projection', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: {
            pk: 'string',
            gsi1pk: 'string',
          },
          primaryIndex: { partitionKey: 'pk' },
          globalIndexes: {
            GSI1: { partitionKey: 'gsi1pk', projection: 'keys_only' },
          },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          GlobalSecondaryIndexes: Match.arrayWith([
            Match.objectLike({
              IndexName: 'GSI1',
              Projection: { ProjectionType: 'KEYS_ONLY' },
            }),
          ]),
        })
      );
    });

    it('should support GSI with include projection', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: {
            pk: 'string',
            gsi1pk: 'string',
          },
          primaryIndex: { partitionKey: 'pk' },
          globalIndexes: {
            GSI1: { partitionKey: 'gsi1pk', projection: ['email', 'name'] },
          },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          GlobalSecondaryIndexes: Match.arrayWith([
            Match.objectLike({
              IndexName: 'GSI1',
              Projection: {
                ProjectionType: 'INCLUDE',
                NonKeyAttributes: ['email', 'name'],
              },
            }),
          ]),
        })
      );
    });
  });

  describe('localIndexes', () => {
    it('should create local secondary indexes', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: {
            pk: 'string',
            sk: 'string',
            lsi1sk: 'number',
          },
          primaryIndex: { partitionKey: 'pk', sortKey: 'sk' },
          localIndexes: {
            LSI1: { sortKey: 'lsi1sk' },
          },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          LocalSecondaryIndexes: Match.arrayWith([
            Match.objectLike({
              IndexName: 'LSI1',
              KeySchema: Match.arrayWith([
                Match.objectLike({ AttributeName: 'pk', KeyType: 'HASH' }),
                Match.objectLike({ AttributeName: 'lsi1sk', KeyType: 'RANGE' }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('replicas', () => {
    it('should create replica tables in specified regions', async () => {
      const app = new App({ mode: 'deploy' });
      const TestStack = function (ctx: StackContext) {
        new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
          // Note: us-east-1 is the default region for tests, so use different regions
          replicas: [{ region: 'us-west-2' }, { region: 'eu-west-1' }],
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      template.hasResourceProperties(
        'AWS::DynamoDB::GlobalTable',
        Match.objectLike({
          Replicas: Match.arrayWith([
            Match.objectLike({ Region: 'us-west-2' }),
            Match.objectLike({ Region: 'eu-west-1' }),
          ]),
        })
      );
    });
  });

  describe('validation', () => {
    it('should throw error when fields is empty', () => {
      const app = new App({ mode: 'deploy' });

      expect(() => {
        const TestStack = function (ctx: StackContext) {
          new GlobalTable(ctx.stack, 'TestTable', {
            fields: {},
            primaryIndex: { partitionKey: 'pk' },
          });
        };
        app.stack(TestStack);
      }).toThrow('No fields defined for the "TestTable" GlobalTable');
    });

    it('should throw error when primaryIndex is missing', () => {
      const app = new App({ mode: 'deploy' });

      expect(() => {
        const TestStack = function (ctx: StackContext) {
          new GlobalTable(ctx.stack, 'TestTable', {
            fields: { pk: 'string' },
          });
        };
        app.stack(TestStack);
      }).toThrow('Missing "primaryIndex" in "TestTable" GlobalTable');
    });

    it('should throw error when partitionKey is missing in primaryIndex', () => {
      const app = new App({ mode: 'deploy' });

      expect(() => {
        const TestStack = function (ctx: StackContext) {
          new GlobalTable(ctx.stack, 'TestTable', {
            fields: { pk: 'string' },
            primaryIndex: {} as { partitionKey: string },
          });
        };
        app.stack(TestStack);
      }).toThrow(
        'Missing "partitionKey" in primary index for the "TestTable" GlobalTable'
      );
    });

    it('should throw error when field referenced in primaryIndex does not exist', () => {
      const app = new App({ mode: 'deploy' });

      expect(() => {
        const TestStack = function (ctx: StackContext) {
          new GlobalTable(ctx.stack, 'TestTable', {
            fields: { pk: 'string' },
            primaryIndex: { partitionKey: 'nonexistent' },
          });
        };
        app.stack(TestStack);
      }).toThrow('Please define "nonexistent" in "fields"');
    });
  });

  describe('getConstructMetadata', () => {
    it('should return correct metadata', async () => {
      const app = new App({ mode: 'deploy' });
      let tableInstance: GlobalTable | undefined;
      const TestStack = function (ctx: StackContext) {
        tableInstance = new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const metadata = tableInstance!.getConstructMetadata();

      expect(metadata.type).toBe('GlobalTable');
      expect(metadata.data.tableName).toBeDefined();
    });
  });

  describe('getBindings', () => {
    it('should return correct bindings with DynamoDB permissions', async () => {
      const app = new App({ mode: 'deploy' });
      let tableInstance: GlobalTable | undefined;
      const TestStack = function (ctx: StackContext) {
        tableInstance = new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      const bindings = tableInstance!.getBindings();

      expect(bindings.clientPackage).toBe('table');
      expect(bindings.variables?.tableName).toBeDefined();
      expect(bindings.variables?.tableName?.type).toBe('plain');
      expect(bindings.permissions).toBeDefined();
      expect(bindings.permissions?.['dynamodb:*']).toBeDefined();
    });
  });

  describe('SST Function binding', () => {
    it('should bind to SST Function with correct permissions', async () => {
      const app = new App({ mode: 'dev' });
      const TestStack = function (ctx: StackContext) {
        const table = new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
        });

        new Function(ctx.stack, 'TestFunction', {
          handler: 'src/index.handler',
          bind: [table],
        });
      };
      app.stack(TestStack);
      await app.finish();

      const template = Template.fromStack(getStack(TestStack));

      // Verify Lambda has environment variable with table name (uses GlobalTable prefix)
      template.hasResourceProperties(
        'AWS::Lambda::Function',
        Match.objectLike({
          Environment: {
            Variables: Match.objectLike({
              SST_GlobalTable_tableName_TestTable: Match.anyValue(),
            }),
          },
        })
      );

      // Verify IAM policy with DynamoDB permissions is attached
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: 'dynamodb:*',
                Effect: 'Allow',
              }),
            ]),
          },
        })
      );
    });
  });

  describe('properties', () => {
    it('should expose tableArn property', async () => {
      const app = new App({ mode: 'deploy' });
      let tableInstance: GlobalTable | undefined;
      const TestStack = function (ctx: StackContext) {
        tableInstance = new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      expect(tableInstance!.tableArn).toBeDefined();
    });

    it('should expose tableName property', async () => {
      const app = new App({ mode: 'deploy' });
      let tableInstance: GlobalTable | undefined;
      const TestStack = function (ctx: StackContext) {
        tableInstance = new GlobalTable(ctx.stack, 'TestTable', {
          fields: { pk: 'string' },
          primaryIndex: { partitionKey: 'pk' },
        });
      };
      app.stack(TestStack);
      await app.finish();

      expect(tableInstance!.tableName).toBeDefined();
    });
  });
});
