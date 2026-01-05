import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Config } from 'sst/node/config';

// ============================================================================
// Types
// ============================================================================

interface CacheEntry {
  clientSecret: string;
  timestamp: number;
}

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  clientSecret: string;
}

// ============================================================================
// Cache Configuration
// ============================================================================

// Cache TTL: 5 minutes (same as ServiceConfig)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Module-level cache
const cache = new Map<string, CacheEntry>();

// Track in-flight requests to avoid concurrent fetches for the same key
const inFlightRequests = new Map<string, Promise<string>>();

// ============================================================================
// Cognito Client
// ============================================================================

const cognitoClient = new CognitoIdentityProviderClient({});

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the complete Cognito configuration from SST Config
 *
 * This function fetches the user pool ID and client ID from SST Config,
 * and retrieves the client secret from Cognito's DescribeUserPoolClient API.
 * The client secret is cached with a 5-minute TTL to avoid excessive API calls.
 *
 * @returns The complete Cognito configuration
 * @throws Error if any configuration values cannot be retrieved
 */
export async function getCognitoConfig(): Promise<CognitoConfig> {
  const userPoolId = Config.COGNITO_USER_POOL_ID;
  const clientId = Config.COGNITO_CLIENT_ID;

  const clientSecret = await getCognitoClientSecret(userPoolId, clientId);

  return {
    userPoolId,
    clientId,
    clientSecret,
  };
}

/**
 * Get the Cognito user pool client secret
 *
 * This function fetches the client secret from Cognito's DescribeUserPoolClient API.
 * It implements caching with a 5-minute TTL and request deduplication to avoid
 * excessive API calls (same pattern as ServiceConfig).
 *
 * @param userPoolId - The Cognito user pool ID
 * @param clientId - The Cognito client ID
 * @returns The client secret
 * @throws Error if the client secret cannot be retrieved
 */
export async function getCognitoClientSecret(
  userPoolId: string,
  clientId: string
): Promise<string> {
  const cacheKey = `${userPoolId}:${clientId}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.clientSecret;
  }

  // Check for in-flight request (request deduplication)
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  // Make the request
  const request = fetchClientSecret(userPoolId, clientId);
  inFlightRequests.set(cacheKey, request);

  try {
    const clientSecret = await request;
    // Cache the result
    cache.set(cacheKey, {
      clientSecret,
      timestamp: Date.now(),
    });
    return clientSecret;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

// For testing purposes - clears the module-level cache
export function resetCache(): void {
  cache.clear();
  inFlightRequests.clear();
}

// ============================================================================
// Private
// ============================================================================

/**
 * Fetch the client secret from Cognito API
 */
async function fetchClientSecret(
  userPoolId: string,
  clientId: string
): Promise<string> {
  try {
    const response = await cognitoClient.send(
      new DescribeUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientId: clientId,
      })
    );

    const clientSecret = response.UserPoolClient?.ClientSecret;
    if (!clientSecret) {
      throw new Error('Client secret not found in response');
    }

    return clientSecret;
  } catch (error) {
    console.error('Error fetching Cognito client secret:', error);
    throw new Error(
      `Failed to fetch Cognito client secret for user pool ${userPoolId}`
    );
  }
}
