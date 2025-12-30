import { describe, it, beforeAll, vi } from 'vitest';
import { Template } from 'aws-cdk-lib/assertions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { initProject } from 'sst/project.js';
import { App, getStack } from 'sst/constructs';
import { Main } from './Main.ts';

// Mock @lib/sst-helpers to avoid account validation in tests
vi.mock('@lib/sst-helpers', () => ({
  removalPolicy: {
    retainForPermanentStage: () => RemovalPolicy.DESTROY,
  },
}));

describe('Main stack', () => {
  beforeAll(async () => {
    await initProject({});
  });

  it('should create UserPool with client configuration and stack outputs', async () => {
    const app = new App({ mode: 'deploy' });
    app.stack(Main);

    await app.finish();

    const template = Template.fromStack(getStack(Main));

    // Group: UserPool creation and client configuration
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ClientName: 'main',
      GenerateSecret: true,
    });

    // Group: Stack outputs
    template.hasOutput('UserPoolId', {});
  });
});
