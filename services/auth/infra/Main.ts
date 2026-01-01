import { Api, StackContext } from 'sst/constructs';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { serviceConfig } from '@lib/sst-helpers';
import { UserPool } from './cognito/UserPool.ts';
import { CognitoTriggers } from './cognito/CognitoTriggers.ts';
import { MagicLink } from './cognito/MagicLink.ts';

export function Main(context: StackContext) {
  const { stack } = context;
  const mainUserPool = new UserPool(stack, 'main', {
    clients: {
      main: {
        generateSecret: true,
      },
    },
  });

  // Create Cognito Lambda triggers for custom auth flow
  const cognitoTriggers = new CognitoTriggers(stack, 'cognito-triggers', {
    userPool: mainUserPool.userPool,
    autoConfirmUsers: true,
    // logLevel: 'DEBUG',
  });

  // Configure magic link authentication
  const magicLink = new MagicLink(stack, 'magic-link', {
    cognitoTriggers,
    allowedOrigins: [
      // TODO: Replace with your actual app origins
      'https://app.example.com',
    ],
    ses: {
      // TODO: Replace with your verified SES email address
      fromAddress: 'noreply@example.com',
      // Optional: specify region if SES is in a different region
      // region: 'us-east-1',
    },
    // Optional configuration
    // expiryDuration: Duration.minutes(15),
    // minimumInterval: Duration.minutes(1),
  });

  // Import the shared internal API from shared-infra service
  const internalApiId = serviceConfig.getParameterValue(context, {
    path: 'shared-infra/internal-api-id',
  });

  const importedHttpApi = HttpApi.fromHttpApiAttributes(
    stack,
    'imported-internal-api',
    {
      httpApiId: internalApiId,
    }
  );

  // Add auth routes to the shared internal API
  const internalApi = new Api(stack, 'internal-api-routes', {
    cdk: {
      httpApi: importedHttpApi,
    },
    defaults: {
      authorizer: 'iam',
    },
    routes: {
      // Catch-all route for auth ORPC handler with /auth prefix
      'ANY /auth/{proxy+}': {
        function: {
          handler: 'functions/src/internal-api/handler.handler',
          runtime: 'nodejs22.x',
        },
      },
    },
  });

  stack.addOutputs({
    InternalApiUrl: internalApi.url + '/auth',
    UserPoolId: mainUserPool.userPool.userPoolId,
    MagicLinkSecretsTable: magicLink.secretsTable.tableName,
  });
}
