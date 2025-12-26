import { StackContext } from 'sst/constructs';
import { NitroSite } from '@lib/sst-constructs';

export function Main(context: StackContext) {
  const { stack } = context;
  const mainSite = new NitroSite(stack, 'MainSite', {
    path: './app',
    buildCommand: 'pnpm build:app',
    dev: {
      deploy: false,
      url: 'http://localhost:3000',
    },
  });

  stack.addOutputs({
    MainSiteUrl: mainSite.url,
  });
}
