import { createORPCClient } from '@orpc/client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { contract } from '@contract/internal-api/auth';
import type { JsonifiedClient } from '@orpc/openapi-client';
import type { ContractRouterClient } from '@orpc/contract';

/**
 * Create an OpenAPI link for the auth internal API
 */
const link = new OpenAPILink(contract, {
  url: () => {
    // Use window.location for client-side, or env var for server-side
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/auth`;
    }
    return (
      process.env.AUTH_INTERNAL_API_URL || 'http://localhost:3000/api/auth'
    );
  },
  headers: () => ({
    'Content-Type': 'application/json',
  }),
});

/**
 * Type-safe client for the auth internal API
 */
export const authClient: JsonifiedClient<
  ContractRouterClient<typeof contract>
> = createORPCClient(link);
