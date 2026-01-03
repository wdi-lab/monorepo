import { createORPCClient } from '@orpc/client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import type { JsonifiedClient } from '@orpc/openapi-client';
import type { ContractRouterClient, AnyContractRouter } from '@orpc/contract';
import { signRequest, type AwsSignatureV4Options } from './sign-request.js';

export type { AwsSignatureV4Options } from './sign-request.js';
export { extractAwsInfoFromUrl, type AwsUrlInfo } from './aws-url.js';

export type InternalApiClient<TContract extends AnyContractRouter> =
  JsonifiedClient<ContractRouterClient<TContract>>;

export interface CreateInternalApiClientOptions<
  TContract extends AnyContractRouter,
> {
  /**
   * The contract to use for the client.
   */
  contract: TContract;

  /**
   * Base URL for the internal API.
   */
  baseUrl: string | (() => string) | (() => Promise<string>);

  /**
   * Custom headers to include in requests.
   * Defaults to `{ 'Content-Type': 'application/json' }`
   */
  headers?: Record<string, string> | (() => Record<string, string>);

  /**
   * AWS Signature V4 signing options for API Gateway.
   *
   * - When `undefined` (default): requests are signed using AWS Signature V4 for API Gateway
   *   with region from `process.env.AWS_REGION` and credentials from environment.
   * - When `false`: signing is disabled.
   * - When an object: use the provided options for signing.
   */
  awsSignatureV4?: AwsSignatureV4Options | false;
}

/**
 * Create a type-safe client for the internal API
 *
 * By default, requests are signed using AWS Signature V4 for API Gateway
 * using the default credential provider chain.
 * Set `awsSignatureV4: false` to disable signing.
 */
export function createInternalApiClient<TContract extends AnyContractRouter>(
  options: CreateInternalApiClientOptions<TContract>
): InternalApiClient<TContract> {
  const { contract, baseUrl, headers, awsSignatureV4 } = options;

  const resolveUrl = typeof baseUrl === 'function' ? baseUrl : () => baseUrl;
  const resolveHeaders =
    typeof headers === 'function'
      ? headers
      : () => headers ?? { 'Content-Type': 'application/json' };

  // Determine if signing is enabled (enabled by default, disabled only when explicitly false)
  const signingEnabled = awsSignatureV4 !== false;
  // Use provided options or empty object for defaults
  const signingOptions: AwsSignatureV4Options | undefined = signingEnabled
    ? awsSignatureV4 || {}
    : undefined;

  const link = new OpenAPILink(contract, {
    url: resolveUrl,
    headers: resolveHeaders,
    fetch: signingOptions
      ? async (request, init) => {
          const signedRequest = await signRequest(request, signingOptions);
          return fetch(signedRequest, init);
        }
      : undefined,
  });

  return createORPCClient(link);
}
