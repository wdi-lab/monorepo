import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext } from 'sst/constructs';
import { UserPool } from './UserPool.ts';

// Mock @lib/sst-helpers to avoid account validation in tests
vi.mock('@lib/sst-helpers', () => ({
  removalPolicy: {
    retainForPermanentStage: () => RemovalPolicy.DESTROY,
  },
}));

describe('UserPool construct', () => {
  beforeAll(async () => {
    await initProject({});
  });

  it('should create UserPool with default configuration and custom id', async () => {
    const app = new App({ mode: 'deploy' });
    let userPoolId;
    const Stack = function (ctx: StackContext) {
      const userPool = new UserPool(ctx.stack, 'custom-id');
      userPoolId = userPool.id;
    };
    app.stack(Stack);

    await app.finish();

    const template = Template.fromStack(getStack(Stack));

    // Group: UserPool creation and id verification
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    expect(userPoolId).toBe('custom-id');

    // Group: Default password policy
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: Match.objectLike({
        PasswordPolicy: Match.objectLike({
          MinimumLength: 8,
          RequireNumbers: true,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireSymbols: true,
        }),
      }),
    });

    // Group: Default sign-in aliases
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AliasAttributes: Match.arrayWith(['email', 'phone_number']),
    });

    // Group: No clients created by default
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 0);
  });

  it('should override password policy with custom props', async () => {
    const app = new App({ mode: 'deploy' });
    const Stack = function (ctx: StackContext) {
      new UserPool(ctx.stack, 'test-user-pool', {
        cdk: {
          userPool: {
            passwordPolicy: {
              minLength: 12,
              requireSymbols: false,
            },
          },
        },
      });
    };
    app.stack(Stack);

    await app.finish();

    const template = Template.fromStack(getStack(Stack));

    // Group: Custom password policy verification
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: Match.objectLike({
        PasswordPolicy: Match.objectLike({
          MinimumLength: 12,
          RequireSymbols: false,
        }),
      }),
    });
  });

  it('should create single client with default config and auth flows', async () => {
    const app = new App({ mode: 'deploy' });
    const Stack = function (ctx: StackContext) {
      new UserPool(ctx.stack, 'test-user-pool', {
        clients: {
          web: {},
        },
      });
    };
    app.stack(Stack);

    await app.finish();

    const template = Template.fromStack(getStack(Stack));

    // Group: Client creation and naming
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    template.hasResourceProperties(
      'AWS::Cognito::UserPoolClient',
      Match.objectLike({
        ClientName: 'web',
      })
    );

    // Group: Default auth flows
    template.hasResourceProperties(
      'AWS::Cognito::UserPoolClient',
      Match.objectLike({
        ExplicitAuthFlows: ['ALLOW_CUSTOM_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
      })
    );

    // Group: Client linked to user pool (verify cross-resource reference)
    const userPoolLogicalId = Object.keys(
      template.findResources('AWS::Cognito::UserPool')
    )[0];
    template.hasResourceProperties(
      'AWS::Cognito::UserPoolClient',
      Match.objectLike({
        UserPoolId: { Ref: userPoolLogicalId },
      })
    );
  });

  it('should create multiple clients with custom configurations', async () => {
    const app = new App({ mode: 'deploy' });
    const Stack = function (ctx: StackContext) {
      new UserPool(ctx.stack, 'test-user-pool', {
        clients: {
          web: {},
          mobile: {},
          backend: {
            generateSecret: true,
          },
        },
      });
    };
    app.stack(Stack);

    await app.finish();

    const template = Template.fromStack(getStack(Stack));

    // Group: Multiple clients creation
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 3);

    // Group: Client with generateSecret configuration
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ClientName: 'backend',
      GenerateSecret: true,
    });
  });
});
