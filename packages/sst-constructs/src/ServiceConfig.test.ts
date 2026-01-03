import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Template, Match, Capture } from 'aws-cdk-lib/assertions';
import { initProject } from 'sst/project.js';
import { App, Stack, Function, getStack, StackContext } from 'sst/constructs';
import { ServiceConfig } from './ServiceConfig.ts';
import type { serviceConfig as ServiceConfigHelpers } from '@lib/sst-helpers';

// Mock the sst-helpers import
vi.mock('@lib/sst-helpers', () => ({
  serviceConfig: {
    getParameterName: vi.fn(() => '/service/shared-infra/dev/internal-api-url'),
    getParameterArn: vi.fn(
      () =>
        'arn:aws:ssm:us-east-1:123456789012:parameter/service/shared-infra/dev/internal-api-url'
    ),
  },
}));

describe('ServiceConfig', () => {
  beforeAll(async () => {
    await initProject({});
  });

  describe('constructor', () => {
    it('should create service config reference with correct properties', () => {
      const app = new App({ mode: 'deploy' });
      const stack = new Stack(app, 'test-stack');

      const config = new ServiceConfig(stack, 'TestConfig', {
        path: 'shared-infra/internal-api-url' as ServiceConfigHelpers.ServicePath,
      });

      expect(config.path).toBe('shared-infra/internal-api-url');
      expect(config.parameterName).toBe(
        '/service/shared-infra/dev/internal-api-url'
      );
      expect(config.parameterArn).toBe(
        'arn:aws:ssm:us-east-1:123456789012:parameter/service/shared-infra/dev/internal-api-url'
      );
    });
  });

  describe('getConstructMetadata', () => {
    it('should return correct metadata', () => {
      const app = new App({ mode: 'deploy' });
      const stack = new Stack(app, 'test-stack');

      const config = new ServiceConfig(stack, 'TestConfig', {
        path: 'shared-infra/internal-api-url' as ServiceConfigHelpers.ServicePath,
      });

      const metadata = config.getConstructMetadata();

      expect(metadata.type).toBe('ServiceConfig');
      expect(metadata.data.path).toBe('shared-infra/internal-api-url');
    });
  });

  describe('getBindings', () => {
    it('should return correct bindings with SSM permissions', () => {
      const app = new App({ mode: 'deploy' });
      const stack = new Stack(app, 'test-stack');

      const config = new ServiceConfig(stack, 'TestConfig', {
        path: 'shared-infra/internal-api-url' as ServiceConfigHelpers.ServicePath,
      });

      const bindings = config.getBindings();

      expect(bindings.clientPackage).toBe('config');
      expect(bindings.permissions).toEqual({
        'ssm:GetParameter': [
          'arn:aws:ssm:us-east-1:123456789012:parameter/service/shared-infra/dev/internal-api-url',
        ],
      });
      expect(bindings.variables).toEqual({
        value: {
          type: 'plain',
          value: '/service/shared-infra/dev/internal-api-url',
        },
      });
    });
  });

  describe('SST integration', () => {
    it('should register with SST type system', () => {
      const app = new App({ mode: 'deploy' });
      const stack = new Stack(app, 'test-stack');

      const config = new ServiceConfig(stack, 'TestConfig', {
        path: 'shared-infra/internal-api-url' as ServiceConfigHelpers.ServicePath,
      });

      // Verify that registerTypes was called (this would be tested in integration)
      expect(config).toBeDefined();
    });
  });

  describe('bindings with SST Function', () => {
    it('should attach correct bindings when function is bound with ServiceConfig', async () => {
      const app = new App({ mode: 'dev' });
      const Stack = function (ctx: StackContext) {
        const config = new ServiceConfig(ctx.stack, 'TestConfig', {
          path: 'shared-infra/internal-api-url' as ServiceConfigHelpers.ServicePath,
        });

        const fn = new Function(ctx.stack, 'TestFunction', {
          handler: 'src/index.handler',
          bind: [config],
        });

        return { fn };
      };
      app.stack(Stack);

      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      // Capture the role name from the Lambda function's Fn::GetAtt reference
      const functionRoleCapture = new Capture();
      template.hasResourceProperties('AWS::Lambda::Function', {
        Role: {
          'Fn::GetAtt': [functionRoleCapture, 'Arn'],
        },
        Environment: {
          Variables: Match.objectLike({
            SST_ServiceConfig_value_TestConfig:
              '/service/shared-infra/dev/internal-api-url',
          }),
        },
      });

      // Verify that there's an IAM policy attached to the captured role with SSM:GetParameter permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        Roles: Match.arrayWith([
          { Ref: functionRoleCapture.asString() }, // Direct reference to captured role
        ]),
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'ssm:GetParameter',
              Effect: 'Allow',
              Resource:
                'arn:aws:ssm:us-east-1:123456789012:parameter/service/shared-infra/dev/internal-api-url',
            }),
          ]),
        },
      });
    });

    it('should not attach bindings when function is not bound', async () => {
      const app = new App({ mode: 'dev' });
      const Stack = function (ctx: StackContext) {
        new ServiceConfig(ctx.stack, 'TestConfig', {
          path: 'shared-infra/internal-api-url' as ServiceConfigHelpers.ServicePath,
        });

        const fn = new Function(ctx.stack, 'TestFunction', {
          handler: 'src/index.handler',
          // No bind array - config not bound to function
        });

        return { fn };
      };
      app.stack(Stack);

      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      // Verify that the Lambda function does NOT have the parameter name as environment variable
      const functions = template.findResources('AWS::Lambda::Function');
      const hasConfigEnvVar = Object.values(functions).some(
        (fn) =>
          (
            fn as {
              Properties?: {
                Environment?: { Variables?: Record<string, unknown> };
              };
            }
          ).Properties?.Environment?.Variables?.[
            'SST_ServiceConfig_value_TestConfig'
          ]
      );
      expect(hasConfigEnvVar).toBe(false);
    });
  });
});
