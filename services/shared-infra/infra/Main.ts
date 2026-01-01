import { Api, StackContext } from 'sst/constructs';
import { serviceConfig } from '@lib/sst-helpers';

export function Main(context: StackContext) {
  const { stack } = context;

  const internalApi = new Api(stack, 'internal-api', {
    accessLog: {
      retention: 'one_week',
    },
    routes: {},
  });

  // Export via SSM for cross-service access
  serviceConfig.createParameter(context, {
    path: 'shared-infra/internal-api-url',
    value: internalApi.url,
  });

  serviceConfig.createParameter(context, {
    path: 'shared-infra/internal-api-id',
    value: internalApi.cdk.httpApi.apiId,
  });

  stack.addOutputs({
    InternalApiUrl: internalApi.url,
    InternalApiId: internalApi.cdk.httpApi.apiId,
  });
}
