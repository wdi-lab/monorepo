import { App } from 'sst/constructs';
import { getHomeRegion } from './regions.ts';

type CheckDeploymentOptions = {
  type: 'home-region-only' | 'multi-region';
};

/**
 * Checks if the deployment should proceed
 */
export const checkDeployment = (
  app: App,
  options: CheckDeploymentOptions = { type: 'home-region-only' }
) => {
  const homeRegion = getHomeRegion();

  if (options.type === 'home-region-only') {
    if (app.region !== homeRegion) {
      console.log(
        `Skipping deployment in ${app.region} region. Only home region (${homeRegion}) is allowed.`
      );
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    }
  }
};
