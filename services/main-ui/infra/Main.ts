import { StackContext } from 'sst/constructs';
import { NitroSite } from 'sst-constructs';

export function Main(context: StackContext) {
  const { stack } = context;
  const mainSite = new NitroSite(stack, 'MainSite', {
    path: './app',
    ...('TURBO_HASH' in process.env
      ? {
          buildCommand: 'echo "Skipping build when turbo repo is detected"',
        }
      : {}),
    dev: {
      deploy: false,
      url: 'http://localhost:3000',
    },
  });

  stack.addOutputs({
    MainSiteUrl: mainSite.url,
  });
}
