import { Api, Config, StackContext } from 'sst/constructs';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { serviceConfig, envConfig } from '@lib/sst-helpers';
import { UserPool } from './cognito/UserPool.ts';
import { CognitoTriggers } from './cognito/CognitoTriggers.ts';
import { MagicLink } from './cognito/MagicLink.ts';

export function Main(context: StackContext) {
  const { stack, app } = context;

  const magicLinkKey = kms.Key.fromKeyArn(
    stack,
    'ImportedMagicLinkKmsKey',
    envConfig.getValue(context, {
      path: 'kms/key-arn',
      id: 'auth-magic-link',
    })
  );

  const mainEmailDomain = envConfig.getValue(context, {
    path: 'email-identity/name',
    id: 'main',
  });

  // Determine allowed origins based on stage
  const mainUiUrl =
    app.stage === 'production'
      ? 'https://app.example.com' // TODO: Replace with your production domain
      : `https://${app.stage}.example.com`; // TODO: Replace with your staging domain pattern

  // For local development, allow localhost
  // For non-production stages, also allow localhost for local testing
  const allowedOrigins =
    app.stage === 'local'
      ? ['http://localhost:3000']
      : app.stage === 'production'
        ? [mainUiUrl]
        : [mainUiUrl, 'http://localhost:3000'];

  const mainUserPool = new UserPool(stack, 'main', {
    clients: {
      main: {
        generateSecret: true,
      },
    },
  });

  // Get the user pool client
  const userPoolClient = mainUserPool.clients.get('main');

  if (!userPoolClient) {
    throw new Error('UserPoolClient main not found');
  }

  // Create Cognito Lambda triggers for custom auth flow
  const cognitoTriggers = new CognitoTriggers(stack, 'cognito-triggers', {
    userPool: mainUserPool.userPool,
    autoConfirmUsers: true,
    // logLevel: 'DEBUG',
  });

  // Configure magic link authentication
  const magicLink = new MagicLink(stack, 'magic-link', {
    cognitoTriggers,
    allowedOrigins,
    kmsKey: magicLinkKey,
    ses: {
      fromAddress: `noreply@${mainEmailDomain}`,
      // Optional: specify region if SES is in a different region
      // region: 'us-east-1',
    },
    // Optional configuration
    // expiryDuration: Duration.minutes(15),
    // minimumInterval: Duration.minutes(1),
  });

  // Create SST Config parameters for Cognito configuration
  const cognitoUserPoolId = new Config.Parameter(
    stack,
    'COGNITO_USER_POOL_ID',
    { value: mainUserPool.userPool.userPoolId }
  );

  const cognitoClientId = new Config.Parameter(stack, 'COGNITO_CLIENT_ID', {
    value: userPoolClient.userPoolClientId,
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
          bind: [cognitoUserPoolId, cognitoClientId],
          permissions: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cognito-idp:DescribeUserPoolClient',
                'cognito-idp:InitiateAuth',
                'cognito-idp:RespondToAuthChallenge',
              ],
              resources: [mainUserPool.userPool.userPoolArn],
            }),
          ],
        },
      },
    },
  });

  // Publish the auth internal API URL for consuming services
  serviceConfig.createParameter(context, {
    path: 'auth/internal-api-url',
    value: internalApi.url + '/auth',
  });

  stack.addOutputs({
    InternalApiUrl: internalApi.url + '/auth',
    UserPoolId: mainUserPool.userPool.userPoolId,
    UserPoolClientId: userPoolClient.userPoolClientId,
    MagicLinkSecretsTable: magicLink.secretsTable.tableName,
    AllowedOrigins: allowedOrigins.join(','),
  });
}
