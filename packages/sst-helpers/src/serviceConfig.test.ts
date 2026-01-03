import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext, Stack } from 'sst/constructs';
import { Construct } from 'constructs';
import {
  createParameter,
  getParameterValue,
  getParameterArn,
  getParameterName,
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
            path: 'shared-infra/internal-api-url',
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
          path: 'auth/internal-api-url',
          region: 'us-east-1',
        });
      };
      app.stack(Stack);
      await app.finish();

      expect(arn!).toContain(':ssm:us-east-1:');
      expect(arn!).toContain(':parameter/service/auth/');
      expect(arn!).toContain('/internal-api-url');
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
        getParameterArn(ctx, { path: 'shared-infra/internal-api-url' });
      };
      app.stack(Stack);
      await app.finish();

      expect(validateServiceDependency).toHaveBeenCalledWith('shared-infra');
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
          getParameterArn(ctx, { path: 'shared-infra/internal-api-url' })
        ).toThrow('Missing service dependency');
      };
      app.stack(Stack);
      await app.finish();
    });

    describe('validateDependency option', () => {
      beforeEach(() => {
        vi.mocked(validateServiceDependency).mockReset();
      });

      it('should skip validation when validateDependency is false in getParameterValue', async () => {
        const app = new App({ mode: 'deploy' });
        const Stack = (ctx: StackContext) => {
          getParameterValue(ctx, {
            path: 'shared-infra/internal-api-url',
            validateDependency: false,
          });
        };
        app.stack(Stack);
        await app.finish();

        expect(validateServiceDependency).not.toHaveBeenCalled();
      });

      it('should skip validation when validateDependency is false in getParameterName', () => {
        const app = new App({ mode: 'deploy' });
        const stack = new Stack(app, 'test-stack');
        const ctx = { stack, app };

        getParameterName(ctx, {
          path: 'shared-infra/internal-api-url',
          validateDependency: false,
        });

        expect(validateServiceDependency).not.toHaveBeenCalled();
      });

      it('should skip validation when validateDependency is false in getParameterArn', async () => {
        const app = new App({ mode: 'deploy' });
        const Stack = (ctx: StackContext) => {
          getParameterArn(ctx, {
            path: 'shared-infra/internal-api-url',
            validateDependency: false,
          });
        };
        app.stack(Stack);
        await app.finish();

        expect(validateServiceDependency).not.toHaveBeenCalled();
      });

      it('should validate when validateDependency is explicitly true in getParameterValue', async () => {
        const app = new App({ mode: 'deploy' });
        const Stack = (ctx: StackContext) => {
          getParameterValue(ctx, {
            path: 'shared-infra/internal-api-url',
            validateDependency: true,
          });
        };
        app.stack(Stack);
        await app.finish();

        expect(validateServiceDependency).toHaveBeenCalledWith('shared-infra');
      });

      it('should validate when validateDependency is explicitly true in getParameterName', () => {
        const app = new App({ mode: 'deploy' });
        const stack = new Stack(app, 'test-stack');
        const ctx = { stack, app };

        getParameterName(ctx, {
          path: 'shared-infra/internal-api-url',
          validateDependency: true,
        });

        expect(validateServiceDependency).toHaveBeenCalledWith('shared-infra');
      });

      it('should not throw when validation is disabled even if dependency is missing', async () => {
        vi.mocked(validateServiceDependency).mockImplementation(() => {
          throw new Error('Missing service dependency');
        });

        const app = new App({ mode: 'deploy' });
        const Stack = (ctx: StackContext) => {
          expect(() =>
            getParameterValue(ctx, {
              path: 'shared-infra/internal-api-url',
              validateDependency: false,
            })
          ).not.toThrow();
        };
        app.stack(Stack);
        await app.finish();

        expect(validateServiceDependency).not.toHaveBeenCalled();
      });
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
      expect(SharedResource.auth.INTERNAL_API_URL).toBe('internal-api-url');
    });
  });

  describe('ServiceName', () => {
    it('should have correct service names', () => {
      expect(ServiceName.SHARED_INFRA).toBe('shared-infra');
      expect(ServiceName.AUTH).toBe('auth');
    });
  });

  describe('getParameterName', () => {
    beforeEach(() => {
      vi.mocked(validateServiceDependency).mockReset();
    });

    it('should return parameter name with service/key options', () => {
      const app = new App({ mode: 'deploy' });
      const stack = new Stack(app, 'test-stack');
      const ctx = { stack, app };

      const paramName = getParameterName(ctx, {
        service: 'shared-infra',
        key: 'internal-api-url',
      });

      expect(paramName).toBe('/service/shared-infra/dev/internal-api-url');
    });

    it('should return parameter name with path option', () => {
      const app = new App({ mode: 'deploy' });
      const stack = new Stack(app, 'test-stack');
      const ctx = { stack, app };

      const paramName = getParameterName(ctx, {
        path: 'shared-infra/internal-api-url',
      });

      expect(paramName).toBe('/service/shared-infra/dev/internal-api-url');
    });

    it('should validate service dependency', () => {
      vi.mocked(validateServiceDependency).mockImplementation(() => {
        throw new Error('Missing service dependency');
      });

      const app = new App({ mode: 'deploy' });
      const stack = new Stack(app, 'test-stack');
      const ctx = { stack, app };

      expect(() =>
        getParameterName(ctx, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          path: 'shared-infra/internal-api-url' as any, // Use valid path but mock validation to fail
        })
      ).toThrow('Missing service dependency');
    });
  });
});
