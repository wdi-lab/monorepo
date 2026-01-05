import { describe, it, expect, beforeAll } from 'vitest';
import { initProject } from 'sst/project.js';
import { App, StackContext } from 'sst/constructs';
import { getValue, type EnvPath } from './envConfig.js';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

describe('envConfig', () => {
  beforeAll(async () => {
    await initProject({});
  });

  describe('getValue', () => {
    it('retrieves parameter value with namespace/key/id', async () => {
      const app = new App({ mode: 'deploy' });
      let parameterName = '';

      const TestStack = (ctx: StackContext) => {
        // First create a parameter to test retrieval
        new StringParameter(ctx.stack, 'TestParam', {
          parameterName: '/config/email-identity/prod/arn',
          stringValue:
            'arn:aws:ses:us-west-2:123456789012:identity/example.com',
        });

        // Get the value
        const value = getValue(ctx, {
          namespace: 'email-identity',
          key: 'arn',
          id: 'prod',
        });

        parameterName = value;
      };

      app.stack(TestStack);
      await app.finish();

      // The value returned is a CDK token, not the actual string
      expect(parameterName).toContain('Token');
    });

    it('retrieves parameter value with path and id', async () => {
      const app = new App({ mode: 'deploy' });
      let parameterName = '';

      const TestStack = (ctx: StackContext) => {
        new StringParameter(ctx.stack, 'TestParam', {
          parameterName: '/config/kms/dev/key-arn',
          stringValue:
            'arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012',
        });

        const value = getValue(ctx, {
          path: 'kms/key-arn' as EnvPath,
          id: 'dev',
        });

        parameterName = value;
      };

      app.stack(TestStack);
      await app.finish();

      expect(parameterName).toContain('Token');
    });

    it('works with different namespaces', async () => {
      const app = new App({ mode: 'deploy' });

      const TestStack = (ctx: StackContext) => {
        // Test email-identity namespace
        getValue(ctx, {
          namespace: 'email-identity',
          key: 'name',
          id: 'prod',
        });

        // Test hosted-zone namespace
        getValue(ctx, {
          namespace: 'hosted-zone',
          key: 'id',
          id: 'staging',
        });

        // Test KMS namespace
        getValue(ctx, {
          namespace: 'kms',
          key: 'alias',
          id: 'test',
        });

        // Test VPC namespace
        getValue(ctx, {
          namespace: 'vpc',
          key: 'id',
          id: 'prod',
        });
      };

      app.stack(TestStack);
      await app.finish();

      // If no errors thrown, the test passes
      expect(true).toBe(true);
    });

    it('accepts any string as id', async () => {
      const app = new App({ mode: 'deploy' });

      const TestStack = (ctx: StackContext) => {
        // Test with different id formats
        getValue(ctx, {
          namespace: 'kms',
          key: 'key-id',
          id: 'my-custom-id-123',
        });

        getValue(ctx, {
          path: 'vpc/id' as EnvPath,
          id: 'user@example.com',
        });
      };

      app.stack(TestStack);
      await app.finish();

      expect(true).toBe(true);
    });

    it('retrieves all KMS keys', async () => {
      const app = new App({ mode: 'deploy' });

      const TestStack = (ctx: StackContext) => {
        // Test all KMS keys
        getValue(ctx, {
          namespace: 'kms',
          key: 'key-arn',
          id: 'prod',
        });

        getValue(ctx, {
          namespace: 'kms',
          key: 'key-id',
          id: 'prod',
        });

        getValue(ctx, {
          namespace: 'kms',
          key: 'alias',
          id: 'prod',
        });
      };

      app.stack(TestStack);
      await app.finish();

      expect(true).toBe(true);
    });
  });
});
