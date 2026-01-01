import { describe, it, expect, beforeAll } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext } from 'sst/constructs';
import { Main } from './Main.ts';

describe('Main stack', () => {
  beforeAll(async () => {
    await initProject({});
  });

  it('should create internal API with IAM auth, access logs, SSM parameters, and stack outputs', async () => {
    const app = new App({ mode: 'deploy' });
    const Stack = (ctx: StackContext) => Main(ctx);
    app.stack(Stack);
    await app.finish();

    const template = Template.fromStack(getStack(Stack));

    // API Gateway V2 (HTTP API) with IAM authorization
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    template.hasResourceProperties(
      'AWS::ApiGatewayV2::Api',
      Match.objectLike({
        ProtocolType: 'HTTP',
      })
    );

    // CloudWatch Log Group for access logs with one_week retention
    template.hasResourceProperties(
      'AWS::Logs::LogGroup',
      Match.objectLike({
        RetentionInDays: 7,
      })
    );

    // SSM parameters for cross-service access
    const ssmParams = template.findResources('AWS::SSM::Parameter');
    expect(Object.keys(ssmParams).length).toBeGreaterThanOrEqual(2);

    template.hasResourceProperties(
      'AWS::SSM::Parameter',
      Match.objectLike({
        Type: 'String',
        Name: Match.stringLikeRegexp(
          '/service/shared-infra/.*/internal-api-url'
        ),
      })
    );

    template.hasResourceProperties(
      'AWS::SSM::Parameter',
      Match.objectLike({
        Type: 'String',
        Name: Match.stringLikeRegexp(
          '/service/shared-infra/.*/internal-api-id'
        ),
      })
    );

    // Stack outputs
    const outputs = template.findOutputs('*');
    expect(Object.keys(outputs)).toContain('InternalApiUrl');
    expect(Object.keys(outputs)).toContain('InternalApiId');
  });
});
