import { serviceConfig } from '@lib/sst-helpers';
import { STAGE, REGION } from '../config.ts';
import { fetchParameter } from './ssm.ts';

type ServicePath = serviceConfig.ServicePath;
type ServiceNameValue = serviceConfig.ServiceNameValue;

/**
 * Fetch SSM parameter value from AWS using service config path
 *
 * Uses STAGE and REGION from config automatically.
 * Path is type-safe and follows the pattern: "service-name/resource-key"
 * Values are cached to ensure only one SDK call per parameter.
 *
 * @example
 * const apiUrl = await getServiceConfig('auth/internal-api-url');
 *
 * @example
 * const internalApiId = await getServiceConfig('shared-infra/internal-api-id');
 */
export async function getServiceConfig(path: ServicePath): Promise<string> {
  // Parse path into service and key
  const [service, key] = path.split('/') as [ServiceNameValue, string];

  // Use serviceConfig.buildParameterName to ensure consistency with infra code
  const parameterName = serviceConfig.buildParameterName(STAGE, service, key);

  try {
    return await fetchParameter(parameterName, { region: REGION });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}. ` +
          `Ensure the service is deployed to stage ${STAGE} in region ${REGION}. Path: ${path}`
      );
    }
    throw error;
  }
}
