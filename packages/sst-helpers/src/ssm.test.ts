import { describe, it, expect, beforeAll } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext } from 'sst/constructs';
import { Construct } from 'constructs';
import {
  getCrossRegionParameterValue,
  getCrossRegionParameterResource,
} from './ssm.ts';

describe('ssm', () => {
  beforeAll(async () => {
    await initProject({});
  });

  describe('getCrossRegionParameterValue', () => {
    it('should create custom resource with correct SSM GetParameter call', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-2',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      // Verify the custom resource is created
      template.hasResourceProperties('Custom::CrossRegionSSMParameter', {
        ServiceToken: Match.anyValue(),
      });
    });

    it('should create IAM policy with correct SSM permission for target region', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-2',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      // Verify IAM policy allows ssm:GetParameter for the target region
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'ssm:GetParameter',
              Effect: 'Allow',
              Resource: Match.objectLike({
                'Fn::Join': Match.arrayWith([
                  Match.arrayWith([
                    Match.stringLikeRegexp(':ssm:us-east-2:'),
                    Match.stringLikeRegexp(
                      ':parameter/config/certificate/main/arn'
                    ),
                  ]),
                ]),
              }),
            }),
          ]),
        },
      });
    });

    it('should use custom ID when provided', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-2',
          id: 'MyCertificateArn',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      // The custom resource should be created (verifies no ID conflict)
      template.hasResourceProperties('Custom::CrossRegionSSMParameter', {
        ServiceToken: Match.anyValue(),
      });
    });

    it('should use custom scope when provided', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        const customScope = new Construct(ctx.stack, 'CustomScope');
        getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-2',
          scope: customScope,
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      // Verify the custom resource is created
      template.hasResourceProperties('Custom::CrossRegionSSMParameter', {
        ServiceToken: Match.anyValue(),
      });
    });

    it('should return a string token', async () => {
      const app = new App({ mode: 'deploy' });
      let result: string;
      const Stack = (ctx: StackContext) => {
        result = getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-2',
        });
      };
      app.stack(Stack);
      await app.finish();

      expect(result!).toBeDefined();
      expect(typeof result!).toBe('string');
    });

    it('should generate unique IDs for different parameters', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-2',
        });
        getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/other/arn',
          region: 'us-east-2',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      // Should have 2 custom resources
      template.resourceCountIs('Custom::CrossRegionSSMParameter', 2);
    });

    it('should generate unique IDs for same parameter in different regions', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-1',
        });
        getCrossRegionParameterValue(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-2',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      // Should have 2 custom resources
      template.resourceCountIs('Custom::CrossRegionSSMParameter', 2);
    });
  });

  describe('getCrossRegionParameterResource', () => {
    it('should return AwsCustomResource instance', async () => {
      const app = new App({ mode: 'deploy' });
      let resource: ReturnType<typeof getCrossRegionParameterResource>;
      const Stack = (ctx: StackContext) => {
        resource = getCrossRegionParameterResource(ctx, {
          parameterName: '/config/certificate/main/arn',
          region: 'us-east-2',
        });
      };
      app.stack(Stack);
      await app.finish();

      expect(resource!).toBeDefined();
      expect(resource!.getResponseField).toBeDefined();
    });

    it('should create custom resource with correct configuration', async () => {
      const app = new App({ mode: 'deploy' });
      const Stack = (ctx: StackContext) => {
        getCrossRegionParameterResource(ctx, {
          parameterName: '/service/auth/prod/api-url',
          region: 'eu-west-1',
          id: 'AuthApiUrl',
        });
      };
      app.stack(Stack);
      await app.finish();

      const template = Template.fromStack(getStack(Stack));

      template.hasResourceProperties('Custom::CrossRegionSSMParameter', {
        ServiceToken: Match.anyValue(),
      });
    });
  });
});
