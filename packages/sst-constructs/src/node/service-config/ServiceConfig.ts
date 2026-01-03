import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { type ServiceConfigResources } from 'sst/node/config';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: string;
  expiresAt: number;
}

// SSM client singleton
const ssmClient = new SSMClient({});

// Cache and in-flight request tracking
const cache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<string | undefined>>();

/**
 * Fetch SSM parameter value with caching and request deduplication
 */
async function fetchParameter(paramName: string): Promise<string | undefined> {
  // Check cache first
  const cached = cache.get(paramName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // Check if there's already an in-flight request for this parameter
  const inFlight = inFlightRequests.get(paramName);
  if (inFlight) {
    return inFlight;
  }

  // Create new request
  const request = (async () => {
    try {
      const command = new GetParameterCommand({
        Name: paramName,
        WithDecryption: true,
      });

      const response = await ssmClient.send(command);
      const value = response.Parameter?.Value;

      if (value) {
        // Cache the result
        cache.set(paramName, {
          value,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      return value;
    } finally {
      // Remove from in-flight requests
      inFlightRequests.delete(paramName);
    }
  })();

  // Store in-flight request
  inFlightRequests.set(paramName, request);

  return request;
}

function createProxy<T extends object>(
  constructName: string,
  ssmPaths: Map<string, string>
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = new Proxy<T>({} as any, {
    get(target, prop) {
      if (typeof prop === 'string') {
        // normalize prop to convert kebab cases like `my-table` to `my_table`
        const normProp = normalizeId(prop);

        // Check if SSM path exists for this property
        const ssmPath = ssmPaths.get(normProp);
        if (!ssmPath) {
          throw new Error(
            `Cannot use ${constructName}.${String(
              prop
            )}. Please make sure it is bound to this function.`
          );
        }

        // Always create a new promise that checks cache
        // This allows cache expiration logic to work properly
        return fetchParameter(ssmPath);
      }
      return Reflect.get(target, prop);
    },
  });

  return result;
}

function normalizeId(name: string) {
  return name.replace(/-/g, '_');
}

declare module 'sst/node/config' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface ServiceConfigResources {}
}

type PromisifyResource<T extends object> = Record<keyof T, Promise<T[keyof T]>>;

// Build map of property names to SSM parameter paths from environment variables
const ssmPaths = new Map<string, string>();
for (const key in process.env) {
  if (key.startsWith('SST_ServiceConfig_value_')) {
    const propName = key.replace('SST_ServiceConfig_value_', '');
    const ssmParamPath = process.env[key];

    if (ssmParamPath) {
      ssmPaths.set(propName, ssmParamPath);
    }
  }
}

export type ServiceConfigTypes = {
  [T in keyof ServiceConfigResources]: string;
};

export const ServiceConfig =
  /* @__PURE__ */ createProxy<PromisifyResource<ServiceConfigTypes>>(
    'ServiceConfig',
    ssmPaths
  );
