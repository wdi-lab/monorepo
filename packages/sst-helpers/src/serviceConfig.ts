import { StackContext } from 'sst/constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Aws } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { validateServiceDependency } from './serviceDependency.js';

/**
 * Service names that publish shared resources via SSM
 */
export const ServiceName = {
  SHARED_INFRA: 'shared-infra',
  AUTH: 'auth',
} as const;

export type ServiceNameValue = (typeof ServiceName)[keyof typeof ServiceName];

/**
 * Known shared resources by service
 */
export const SharedResource = {
  'shared-infra': {
    INTERNAL_API_URL: 'internal-api-url',
    INTERNAL_API_ID: 'internal-api-id',
  },
  auth: {
    USER_POOL_ID: 'user-pool-id',
    USER_POOL_CLIENT_ID: 'user-pool-client-id',
  },
} as const satisfies Record<ServiceNameValue, Record<string, string>>;

export type SharedResourceKey<S extends ServiceNameValue> =
  (typeof SharedResource)[S][keyof (typeof SharedResource)[S]];

/**
 * Helper type to build path for a specific service
 */
type ServicePathFor<S extends ServiceNameValue> =
  `${S}/${SharedResourceKey<S> & string}`;

/**
 * Union of all valid service/key paths
 * e.g., "shared-infra/internal-api-url" | "auth/user-pool-id" | ...
 */
export type ServicePath = {
  [S in ServiceNameValue]: ServicePathFor<S>;
}[ServiceNameValue];

// ============ Options Types ============

type BaseOptions = {
  scope?: Construct;
};

type ServiceKeyIdentifier<S extends ServiceNameValue> = {
  service: S;
  key: SharedResourceKey<S>;
};

type PathIdentifier = {
  path: ServicePath;
};

type CreateParameterOptions<S extends ServiceNameValue = ServiceNameValue> =
  BaseOptions & { value: string } & (ServiceKeyIdentifier<S> | PathIdentifier);

type GetParameterOptions<S extends ServiceNameValue = ServiceNameValue> =
  BaseOptions & { region?: string } & (
      | ServiceKeyIdentifier<S>
      | PathIdentifier
    );

// ============ Helpers ============

const parsePath = (
  path: ServicePath
): { service: ServiceNameValue; key: string } => {
  const [service, key] = path.split('/') as [ServiceNameValue, string];
  return { service, key };
};

const resolveServiceKey = <S extends ServiceNameValue>(
  options: ServiceKeyIdentifier<S> | PathIdentifier
): { service: ServiceNameValue; key: string } => {
  if ('path' in options) {
    return parsePath(options.path);
  }
  return { service: options.service, key: options.key as string };
};

/**
 * Generates a consistent SSM parameter path
 * Format: /service/<service-name>/<stage>/<resource-key>
 */
const getParameterName = (
  stage: string,
  serviceName: ServiceNameValue,
  key: string
): string => {
  return `/service/${serviceName}/${stage}/${key}`;
};

/**
 * Creates an SSM StringParameter for a shared resource
 *
 * @example
 * // Using service/key
 * createParameter(ctx, {
 *   service: 'shared-infra',
 *   key: 'internal-api-url',
 *   value: api.url,
 * });
 *
 * @example
 * // Using path
 * createParameter(ctx, {
 *   path: 'shared-infra/internal-api-url',
 *   value: api.url,
 * });
 */
export const createParameter = <S extends ServiceNameValue>(
  context: StackContext,
  options: CreateParameterOptions<S>
): StringParameter => {
  const { stack, app } = context;
  const { service, key } = resolveServiceKey(options);

  const id = `ServiceConfig-${service}-${key}`.replace(/[^a-zA-Z0-9-]/g, '-');

  return new StringParameter(options.scope ?? stack, id, {
    parameterName: getParameterName(app.stage, service, key),
    stringValue: options.value,
  });
};

/**
 * Gets SSM parameter value for use in consuming services
 *
 * @example
 * // Using service/key
 * const apiUrl = getParameterValue(ctx, {
 *   service: 'shared-infra',
 *   key: 'internal-api-url',
 * });
 *
 * @example
 * // Using path
 * const apiUrl = getParameterValue(ctx, {
 *   path: 'shared-infra/internal-api-url',
 * });
 */
export const getParameterValue = <S extends ServiceNameValue>(
  context: StackContext,
  options: GetParameterOptions<S>
): string => {
  const { stack, app } = context;
  const { service, key } = resolveServiceKey(options);

  // Validate service dependency
  validateServiceDependency(service);

  if (options.region) {
    throw new Error(
      'Cross-region parameter retrieval is not supported for value lookup.'
    );
  }

  return StringParameter.valueForStringParameter(
    options.scope ?? stack,
    getParameterName(app.stage, service, key)
  );
};

/**
 * Generates the ARN for an SSM parameter (for IAM policies)
 *
 * @example
 * // Using service/key
 * const arn = getParameterArn(ctx, {
 *   service: 'shared-infra',
 *   key: 'internal-api-url',
 * });
 *
 * @example
 * // Using path
 * const arn = getParameterArn(ctx, {
 *   path: 'shared-infra/internal-api-url',
 * });
 *
 * @example
 * // Cross-region ARN
 * const arn = getParameterArn(ctx, {
 *   path: 'auth/user-pool-id',
 *   region: 'us-east-1',
 * });
 */
export const getParameterArn = <S extends ServiceNameValue>(
  context: StackContext,
  options: GetParameterOptions<S>
): string => {
  const { app } = context;
  const { service, key } = resolveServiceKey(options);

  // Validate service dependency
  validateServiceDependency(service);

  const targetRegion = options.region ?? Aws.REGION;
  const parameterName = getParameterName(app.stage, service, key);

  return `arn:${Aws.PARTITION}:ssm:${targetRegion}:${Aws.ACCOUNT_ID}:parameter${parameterName}`;
};
