import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext } from 'sst/constructs';
import { Construct } from 'constructs';
import {
  createParameter,
  getParameterValue,
  getParameterArn,
  SharedResource,
  ServiceName,
  ServicePath,
} from './serviceConfig.ts';

// Mock the serviceDependency module
vi.mock('./serviceDependency.js', () => ({
  validateServiceDependency: vi.fn(),
}));

import { validateServiceDependency } from './serviceDependency.js';

describe('serviceConfig', () => {
  beforeAll(async () => {
    await initProject({});
  });

  describe('createParameter', () => {
    it('should create SSM parameter with service/key options', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        createParameter(ctx, {
          service: 'shared-infra',
          key: 'internal-api-url',
          value: 'https://api.example.com',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Type: 'String',
        Value: 'https://api.example.com',
        Name: Match.stringLikeRegexp(
          '/service/shared-infra/.*/internal-api-url'
        ),
      });
    });

    it('should create SSM parameter with path option', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        createParameter(ctx, {
          path: 'shared-infra/internal-api-url',
          value: 'https://api.example.com',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Type: 'String',
        Value: 'https://api.example.com',
        Name: Match.stringLikeRegexp(
          '/service/shared-infra/.*/internal-api-url'
        ),
      });
    });

    it('should create SSM parameter for auth service with path', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        createParameter(ctx, {
          path: 'auth/user-pool-id',
          value: 'us-west-2_abc123',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Type: 'String',
        Value: 'us-west-2_abc123',
        Name: Match.stringLikeRegexp('/service/auth/.*/user-pool-id'),
      });
    });

    it('should generate unique construct IDs for different parameters', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        createParameter(ctx, {
          path: 'shared-infra/internal-api-url',
          value: 'https://api.example.com',
        });
        createParameter(ctx, {
          path: 'shared-infra/internal-api-id',
          value: 'api-123',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));
      template.resourceCountIs('AWS::SSM::Parameter', 2);
    });

    it('should use custom scope when provided', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        const customScope = new Construct(ctx.stack, 'CustomScope');
        createParameter(ctx, {
          path: 'shared-infra/internal-api-url',
          value: 'https://api.example.com',
          scope: customScope,
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Type: 'String',
        Value: 'https://api.example.com',
        Name: Match.stringLikeRegexp(
          '/service/shared-infra/.*/internal-api-url'
        ),
      });
    });
  });

  describe('getParameterValue', () => {
    it('should return parameter reference with service/key options', async () => {
      const app = new App({ mode: 'deploy' });
      let paramValue: string;
      const Stack = (ctx: StackContext) => {
        paramValue = getParameterValue(ctx, {
          service: 'shared-infra',
          key: 'internal-api-url',
        });
      };
      app.stack(Stack);
      await app.finish();

      expect(paramValue!).toBeDefined();
      expect(typeof paramValue!).toBe('string');
    });

    it('should return parameter reference with path option', async () => {
      const app = new App({ mode: 'deploy' });
      let paramValue: string;
      const Stack = (ctx: StackContext) => {
        paramValue = getParameterValue(ctx, {
          path: 'shared-infra/internal-api-url',
        });
      };
      app.stack(Stack);
      await app.finish();

      expect(paramValue!).toBeDefined();
      expect(typeof paramValue!).toBe('string');
    });

    it('should throw error for cross-region parameter lookup', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        expect(() =>
          getParameterValue(ctx, {
            path: 'auth/user-pool-id',
            region: 'us-east-1',
          })
        ).toThrow(
          'Cross-region parameter retrieval is not supported for value lookup.'
        );
      };
      app.stack(Stack);
      await app.finish();
    });
  });

  describe('getParameterArn', () => {
    it('should generate correct ARN with service/key options', async () => {
      const app = new App({ mode: 'deploy' });
      let arn: string;
      const Stack = (ctx: StackContext) => {
        arn = getParameterArn(ctx, {
          service: 'shared-infra',
          key: 'internal-api-url',
        });
      };
      app.stack(Stack);
      await app.finish();

      expect(arn!).toContain(':ssm:');
      expect(arn!).toContain(':parameter/service/shared-infra/');
      expect(arn!).toContain('/internal-api-url');
    });

    it('should generate correct ARN with path option', async () => {
      const app = new App({ mode: 'deploy' });
      let arn: string;
      const Stack = (ctx: StackContext) => {
        arn = getParameterArn(ctx, {
          path: 'shared-infra/internal-api-url',
        });
      };
      app.stack(Stack);
      await app.finish();

      expect(arn!).toContain(':ssm:');
      expect(arn!).toContain(':parameter/service/shared-infra/');
      expect(arn!).toContain('/internal-api-url');
    });

    it('should generate correct ARN for cross-region with path', async () => {
      const app = new App({ mode: 'deploy' });
      let arn: string;
      const Stack = (ctx: StackContext) => {
        arn = getParameterArn(ctx, {
          path: 'auth/user-pool-id',
          region: 'us-east-1',
        });
      };
      app.stack(Stack);
      await app.finish();

      expect(arn!).toContain(':ssm:us-east-1:');
      expect(arn!).toContain(':parameter/service/auth/');
      expect(arn!).toContain('/user-pool-id');
    });
  });

  describe('service dependency validation', () => {
    beforeEach(() => {
      vi.mocked(validateServiceDependency).mockClear();
    });

    it('should call validateServiceDependency with correct service for getParameterValue', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        getParameterValue(ctx, { path: 'shared-infra/internal-api-url' });
      };
      app.stack(Stack);
      await app.finish();

      expect(validateServiceDependency).toHaveBeenCalledWith('shared-infra');
    });

    it('should call validateServiceDependency with correct service for getParameterArn', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        getParameterArn(ctx, { path: 'auth/user-pool-id' });
      };
      app.stack(Stack);
      await app.finish();

      expect(validateServiceDependency).toHaveBeenCalledWith('auth');
    });

    it('should propagate error from validateServiceDependency in getParameterValue', async () => {
      vi.mocked(validateServiceDependency).mockImplementation(() => {
        throw new Error('Missing service dependency');
      });

      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        expect(() =>
          getParameterValue(ctx, { path: 'shared-infra/internal-api-url' })
        ).toThrow('Missing service dependency');
      };
      app.stack(Stack);
      await app.finish();
    });

    it('should propagate error from validateServiceDependency in getParameterArn', async () => {
      vi.mocked(validateServiceDependency).mockImplementation(() => {
        throw new Error('Missing service dependency');
      });

      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        expect(() =>
          getParameterArn(ctx, { path: 'auth/user-pool-id' })
        ).toThrow('Missing service dependency');
      };
      app.stack(Stack);
      await app.finish();
    });
  });

  describe('ServicePath type', () => {
    it('should allow valid paths', () => {
      // Type check - these should compile without errors
      const paths: ServicePath[] = [
        'shared-infra/internal-api-url',
        'shared-infra/internal-api-id',
        'auth/user-pool-id',
        'auth/user-pool-client-id',
      ];
      expect(paths).toHaveLength(4);
    });
  });

  describe('SharedResource', () => {
    it('should have shared-infra resources', () => {
      expect(SharedResource['shared-infra'].INTERNAL_API_URL).toBe(
        'internal-api-url'
      );
      expect(SharedResource['shared-infra'].INTERNAL_API_ID).toBe(
        'internal-api-id'
      );
    });

    it('should have auth resources', () => {
      expect(SharedResource.auth.USER_POOL_ID).toBe('user-pool-id');
      expect(SharedResource.auth.USER_POOL_CLIENT_ID).toBe(
        'user-pool-client-id'
      );
    });
  });

  describe('ServiceName', () => {
    it('should have correct service names', () => {
      expect(ServiceName.SHARED_INFRA).toBe('shared-infra');
      expect(ServiceName.AUTH).toBe('auth');
    });
  });
});
