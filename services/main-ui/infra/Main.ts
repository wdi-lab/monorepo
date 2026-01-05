import { StackContext } from 'sst/constructs';
import { NitroSite, ServiceConfig } from '@lib/sst-constructs';
import { serviceConfig } from '@lib/sst-helpers';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface MainProps {
  appPath?: string;
}

export function Main(context: StackContext, props?: MainProps) {
  const { stack } = context;
  const appPath = props?.appPath ?? './app';

  // Import internal API ID from shared infra service
  const internalApiId = serviceConfig.getParameterValue(context, {
    path: 'shared-infra/internal-api-id',
  });

  // Import auth internal API URL from auth service
  const authInternalApiUrl = new ServiceConfig(stack, 'AuthInternalApiUrl', {
    path: 'auth/internal-api-url',
  });

  const mainSite = new NitroSite(stack, 'MainSite', {
    path: appPath,
    buildCommand: 'pnpm build:app',
    dev: {
      deploy: false,
      url: 'http://localhost:3000',
    },
    bind: [authInternalApiUrl],
    permissions: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:Invoke'],
        resources: [
          `arn:aws:execute-api:${stack.region}:${stack.account}:${internalApiId}/*`,
        ],
      }),
    ],
  });

  stack.addOutputs({
    MainSiteUrl: mainSite.url,
  });
}
