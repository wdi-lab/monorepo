import * as fs from 'fs';
import * as path from 'path';
import { VisibleError } from 'sst/error.js';

/**
 * Reads package.json from the current working directory and returns dependencies
 */
const getPackageDependencies = (): Record<string, string> => {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new VisibleError(
      `Cannot find package.json at ${packageJsonPath}.`,
      `serviceConfig must be called from a service directory.`
    );
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
};

/**
 * Validates that the current service has declared a dependency on the provider service.
 * This ensures Turborepo deploys services in the correct order.
 *
 * @param providerService - The service name that provides the SSM parameter
 * @throws VisibleError if the dependency is not declared in package.json
 */
export const validateServiceDependency = (providerService: string): void => {
  const dependencies = getPackageDependencies();
  const requiredDep = `@infra/${providerService}`;

  if (!(requiredDep in dependencies)) {
    throw new VisibleError(
      `Missing service dependency: This service uses serviceConfig to read from '${providerService}',`,
      `but '${requiredDep}' is not listed in package.json dependencies.`,
      `Add "${requiredDep}": "workspace:*" to ensure correct deployment order.`
    );
  }
};
