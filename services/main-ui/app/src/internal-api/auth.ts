import { createInternalApiClient } from '@client/internal-api';
import { ServiceConfig } from '@lib/sst-constructs/node/service-config';
import { contract } from '@contract/internal-api/auth';

/**
 * Type-safe client for the auth internal API
 *
 * Note: This client uses AWS Signature V4 signing and should only be used
 * on the server side (in server actions or API routes).
 */
export const authClient = createInternalApiClient({
  contract,
  baseUrl: () => ServiceConfig.AuthInternalApiUrl,
});
