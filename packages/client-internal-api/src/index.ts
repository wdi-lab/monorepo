import { createORPCClient, onError } from '@orpc/client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import type { JsonifiedClient } from '@orpc/openapi-client';
import type { ContractRouterClient, AnyContractRouter } from '@orpc/contract';
import type { Interceptor } from '@orpc/shared';
import { signRequest, type AwsSignatureV4Options } from './sign-request.js';

export type { AwsSignatureV4Options } from './sign-request.js';
export { extractAwsInfoFromUrl, type AwsUrlInfo } from './aws-url.js';
export { onError, onSuccess, onStart, onFinish } from '@orpc/client';

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

  /**
   * Error handler for the OpenAPI link.
   * Shorthand for `interceptors: [onError(handler)]`.
   *
   * @example
   * ```ts
   * const client = createInternalApiClient({
   *   contract,
   *   baseUrl: 'https://api.example.com',
   *   onError: (error) => {
   *     console.error('API error:', error);
   *   },
   * });
   * ```
   */
  onError?: (error: unknown) => void;

  /**
   * Custom interceptors for the OpenAPI link.
   * Use interceptors from '@orpc/client' like `onError`, `onSuccess`, `onStart`, `onFinish`.
   *
   * @example
   * ```ts
   * import { onError, onSuccess } from '@client/internal-api';
   *
   * const client = createInternalApiClient({
   *   contract,
   *   baseUrl: 'https://api.example.com',
   *   interceptors: [
   *     onError((error) => {
   *       console.error('API error:', error);
   *     }),
   *     onSuccess((result) => {
   *       console.log('API success:', result);
   *     }),
   *   ],
   * });
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interceptors?: Interceptor<any, any>[];
}

/**
 * Create a type-safe client for the internal API
 *
 * By default, requests are signed using AWS Signature V4 for API Gateway
 * using the default credential provider chain.
 * Set `awsSignatureV4: false` to disable signing.
 *
 * @example
 * ```ts
 * import { createInternalApiClient, onError } from '@client/internal-api';
 * import { contract } from '@contract/internal-api/auth';
 *
 * // Basic usage
 * const client = createInternalApiClient({
 *   contract,
 *   baseUrl: 'https://api.example.com',
 * });
 *
 * // With error handling (shorthand)
 * const clientWithErrorHandling = createInternalApiClient({
 *   contract,
 *   baseUrl: 'https://api.example.com',
 *   onError: (error) => {
 *     console.error('API error:', error);
 *   },
 * });
 *
 * // With multiple interceptors
 * const clientWithInterceptors = createInternalApiClient({
 *   contract,
 *   baseUrl: 'https://api.example.com',
 *   interceptors: [
 *     onError((error) => {
 *       console.error('API error:', error);
 *     }),
 *   ],
 * });
 * ```
 */
export function createInternalApiClient<TContract extends AnyContractRouter>(
  options: CreateInternalApiClientOptions<TContract>
): InternalApiClient<TContract> {
  const {
    contract,
    baseUrl,
    headers,
    awsSignatureV4,
    interceptors,
    onError: onErrorHandler,
  } = options;

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

  // Combine onError handler with custom interceptors
  const allInterceptors = [
    ...(onErrorHandler ? [onError(onErrorHandler)] : []),
    ...(interceptors || []),
  ];

  const link = new OpenAPILink(contract, {
    url: resolveUrl,
    headers: resolveHeaders,
    fetch: signingOptions
      ? async (request, init) => {
          const signedRequest = await signRequest(request, signingOptions);
          return fetch(signedRequest, init);
        }
      : undefined,
    interceptors:
      allInterceptors.length > 0
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (allInterceptors as any)
        : undefined,
  });

  return createORPCClient(link);
}
