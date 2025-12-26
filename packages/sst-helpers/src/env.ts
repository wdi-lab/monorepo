import { StackContext } from 'sst/constructs';
import { AWS_ACCOUNTS } from './constants.ts';

export const accountEnv = (context: StackContext) => {
  const { account } = context.app;
  switch (account) {
    case AWS_ACCOUNTS.DEV:
      return 'DEV';

    case AWS_ACCOUNTS.PROD:
      return 'PROD';
    default:
      throw new Error(`Unable to get env name for account ${account}`);
  }
};

export const isPreviewStage = (context: StackContext) => {
  const env = accountEnv(context);
  return env === 'DEV' && context.app.stage.toUpperCase() !== 'DEV';
};

export const isPermanentStage = (context: StackContext) => {
  return !isPreviewStage(context);
};
