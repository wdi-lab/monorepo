import { Api, StackContext } from 'sst/constructs';

export function Main({ stack }: StackContext) {
  const api = new Api(stack, 'api', {
    defaults: {
      authorizer: 'none',
    },
    routes: {
      'ANY /{proxy+}': {
        function: {
          handler: './functions/src/api.handler',
          nodejs: {
            install: ['express'],
          },
        },
      },
      'ANY /protected': {
        authorizer: 'iam',
        function: {
          handler: './functions/src/api.handler',
        },
      },
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
