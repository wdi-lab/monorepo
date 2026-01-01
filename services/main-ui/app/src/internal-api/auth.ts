import { createInternalApiClient } from '@client/internal-api';
import { contract } from '@contract/internal-api/auth';

/**
 * Type-safe client for the auth internal API
 */
export const authClient = createInternalApiClient({
  contract,
  baseUrl:
    process.env.AUTH_INTERNAL_API_URL || 'https://localhost:90001/api/auth',
});
