import { describe, it, beforeAll, vi } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext } from 'sst/constructs';
import { Main } from './Main.ts';

// Mock @lib/sst-helpers to avoid account validation in tests
vi.mock('@lib/sst-helpers', () => ({
  removalPolicy: {
    retainForPermanentStage: () => RemovalPolicy.DESTROY,
  },
  serviceConfig: {
    getParameterValue: () => 'mock-api-id',
  },
}));

describe('Main stack', () => {
  beforeAll(async () => {
    await initProject({});
  });

  it('should create UserPool, Cognito triggers, and internal API routes', async () => {
    const app = new App({ mode: 'deploy' });
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
  });
});
