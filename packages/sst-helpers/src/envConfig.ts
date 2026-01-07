import { StackContext } from 'sst/constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

/**
 * Environment config mapping with namespaces and their keys
 * Add new namespaces and keys here - they will be automatically type-safe
 *
 * Not exported - use the type-safe getValue() function to retrieve values
 */
const _ENV_CONFIG_MAPPING = {
  'email-identity': {
    ARN: 'arn',
    NAME: 'name',
  },
  'hosted-zone': {
    ID: 'id',
  },
  kms: {
    KEY_ARN: 'key-arn',
    KEY_ID: 'key-id',
    ALIAS: 'alias',
  },
  certificate: {
    ARN: 'arn',
  },
  vpc: {
    ID: 'id',
  },
} as const;

export type EnvNamespaceValue = keyof typeof _ENV_CONFIG_MAPPING;

export type _ENV_CONFIG_MAPPINGKeyFor<N extends EnvNamespaceValue> =
  (typeof _ENV_CONFIG_MAPPING)[N][keyof (typeof _ENV_CONFIG_MAPPING)[N]];

/**
 * Helper type to build path for a specific namespace
 */
type EnvPathFor<N extends EnvNamespaceValue> =
  `${N}/${_ENV_CONFIG_MAPPINGKeyFor<N> & string}`;

/**
 * Union of all valid namespace/key paths
 * e.g., "email-identity/arn" | "kms/key-arn" | ...
 */
export type EnvPath = {
  [N in EnvNamespaceValue]: EnvPathFor<N>;
}[EnvNamespaceValue];

// ============ Options Types ============

type NamespaceKeyIdentifier<N extends EnvNamespaceValue> = {
  namespace: N;
  key: _ENV_CONFIG_MAPPINGKeyFor<N>;
  id: string;
  scope?: Construct;
};

type PathIdentifier = {
  path: EnvPath;
  id: string;
  scope?: Construct;
};

type Get_ENV_CONFIG_MAPPINGOptions<
  N extends EnvNamespaceValue = EnvNamespaceValue,
> = NamespaceKeyIdentifier<N> | PathIdentifier;

// ============ Helpers ============

const parsePath = (
  path: EnvPath
): { namespace: EnvNamespaceValue; key: string } => {
  const [namespace, key] = path.split('/') as [EnvNamespaceValue, string];
  return { namespace, key };
};

const resolveNamespaceKey = <N extends EnvNamespaceValue>(
  options: Get_ENV_CONFIG_MAPPINGOptions<N>
): { namespace: EnvNamespaceValue; key: string } => {
  if ('path' in options) {
    return parsePath(options.path);
  }
  return { namespace: options.namespace, key: options.key as string };
};

/**
 * Gets SSM parameter value for environment configuration
 * Format: /config/<namespace>/<id>/<key>
 *
 * @example
 * // Using namespace/key
 * const emailArn = getValue(ctx, {
 *   namespace: 'email-identity',
 *   key: 'arn',
 *   id: 'prod',
 * });
 *
 * @example
 * // Using path
 * const kmsKeyArn = getValue(ctx, {
 *   path: 'kms/key-arn',
 *   id: 'prod',
 * });
 */
export const getValue = <N extends EnvNamespaceValue>(
  context: StackContext,
  options: Get_ENV_CONFIG_MAPPINGOptions<N>
): string => {
  const { stack } = context;
  const parameterName = getParameterName(options);

  return StringParameter.valueForStringParameter(
    options.scope ?? stack,
    parameterName
  );
};

export const getParameterName = <N extends EnvNamespaceValue>(
  options: Get_ENV_CONFIG_MAPPINGOptions<N>
): string => {
  const { namespace, key } = resolveNamespaceKey(options);

  return `/config/${namespace}/${options.id}/${key}`;
};
