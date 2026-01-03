import { describe, it, beforeAll, vi } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext } from 'sst/constructs';
import { Main } from './Main.ts';

// Mock only removalPolicy to avoid account validation in tests
// serviceConfig uses actual implementation
vi.mock('@lib/sst-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lib/sst-helpers')>();
  return {
    ...actual,
    removalPolicy: {
      retainForPermanentStage: () => RemovalPolicy.DESTROY,
    },
  };
});

describe('Main stack', () => {
  beforeAll(async () => {
    await initProject({});
  });

  it('should create UserPool, Cognito triggers, and internal API routes', async () => {
    const app = new App({ mode: 'deploy', stage: 'test' });
    const Stack = (ctx: StackContext) => Main(ctx);
    app.stack(Stack);

    await app.finish();

    const template = Template.fromStack(getStack(Stack));

    // UserPool and client
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.hasResourceProperties(
      'AWS::Cognito::UserPoolClient',
      Match.objectLike({
        ClientName: 'main',
        GenerateSecret: true,
      })
    );

    // Internal API route for /auth/{proxy+} with IAM authorization
    template.hasResourceProperties(
      'AWS::ApiGatewayV2::Route',
      Match.objectLike({
        RouteKey: 'ANY /auth/{proxy+}',
        AuthorizationType: 'AWS_IAM',
      })
    );

    // Lambda integration
    template.hasResourceProperties(
      'AWS::ApiGatewayV2::Integration',
      Match.objectLike({
        IntegrationType: 'AWS_PROXY',
        PayloadFormatVersion: '2.0',
      })
    );

    // Stack outputs
    template.hasOutput('UserPoolId', {});

    // SSM Parameter for auth internal API URL (created by actual implementation)
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Type: 'String',
      Name: '/service/auth/test/internal-api-url',
    });
  });
});
