import { StackContext } from 'sst/constructs';
import { NitroSite } from '@lib/sst-constructs';
import { ServiceConfig } from '@lib/sst-constructs';

export interface MainProps {
  appPath?: string;
}

export function Main(context: StackContext, props?: MainProps) {
  const { stack } = context;
  const appPath = props?.appPath ?? './app';

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
  });

  stack.addOutputs({
    MainSiteUrl: mainSite.url,
  });
}
