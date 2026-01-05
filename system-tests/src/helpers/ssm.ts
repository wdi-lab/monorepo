import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { REGION } from '../config.ts';

// Cache to store fetched parameter values
const parameterCache = new Map<string, string>();

/**
 * Fetch SSM parameter value by full parameter name
 * Values are cached by default to ensure only one SDK call per parameter.
 *
 * @param parameterName - Full SSM parameter name (e.g., "/service/auth/dev/internal-api-url")
 * @param options - Configuration options
 * @param options.region - AWS region (defaults to REGION from config)
 * @param options.useCache - Whether to use cache (defaults to true)
 * @returns The parameter value
 */
export async function fetchParameter(
  parameterName: string,
  options: { region?: string; useCache?: boolean } = {}
): Promise<string> {
  const { region = REGION, useCache = true } = options;

  // Check cache first if enabled
  const cacheKey = `${region}:${parameterName}`;
  if (useCache && parameterCache.has(cacheKey)) {
    return parameterCache.get(cacheKey)!;
  }

  const client = new SSMClient({ region });

  try {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: false,
    });

    const response = await client.send(command);

    if (!response.Parameter?.Value) {
      throw new Error(
        `Parameter ${parameterName} exists but has no value in region ${region}`
      );
    }

    // Cache the value if caching is enabled
    if (useCache) {
      parameterCache.set(cacheKey, response.Parameter.Value);
    }

    return response.Parameter.Value;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to get SSM parameter ${parameterName} in region ${region}: ${error.message}`
      );
    }
    throw error;
  }
}
