import { describe, it, expect, beforeAll } from 'vitest';
import { createInternalApiClient } from '@client/internal-api';
import { auth } from '@contract/internal-api';
import { getServiceConfig } from '../../helpers/serviceConfig.ts';

/**
 * Auth Service Tests
 */
describe('Auth Service', () => {
  let authClient: ReturnType<
    typeof createInternalApiClient<typeof auth.contract>
  >;

  beforeAll(async () => {
    // Fetch the internal API URL from SSM Parameter Store
    // This uses the serviceConfig pattern: /service/auth/<stage>/internal-api-url
    // Uses STAGE and REGION from config automatically
    const authApiUrl = await getServiceConfig('auth/internal-api-url');

    // Create ORPC client with AWS SigV4 signing
    authClient = createInternalApiClient({
      contract: auth.contract,
      baseUrl: authApiUrl,
    });
  });

  describe('Magic Link Authentication', () => {
    it('should initiate magic link authentication', async () => {
      const testEmail = 'test@example.com';
      // Use localhost redirect URI which is in the allowed origins
      const testRedirectUri = 'http://localhost:3000/auth/callback';

      const response = await authClient.magicLink.initiate({
        email: testEmail,
        redirectUri: testRedirectUri,
      });
      // Verify response structure matches contract
      expect(response).toBeDefined();
      expect(response).toHaveProperty('session');
      expect(response).toHaveProperty('message');

      // Verify session is a non-empty string
      expect(typeof response.session).toBe('string');
      expect(response.session.length).toBeGreaterThan(0);

      // Verify exact message from service
      expect(response.message).toBe(
        'Magic link sent to your email. Please check your inbox.'
      );
    });
  });
});
