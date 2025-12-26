import { StackContext } from 'sst/constructs';
import { UserPool } from './cognito/UserPool.ts';

export function Main({ stack }: StackContext) {
  const mainUserPool = new UserPool(stack, 'main', {
    clients: {
      main: {
        generateSecret: true,
      },
    },
  });

  stack.addOutputs({
    UserPoolId: mainUserPool.userPool.userPoolId,
  });
}
