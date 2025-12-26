import { SSTConfig } from 'sst';
import { Main } from './infra/Main.ts';
import { deploy } from '@lib/sst-helpers';

const config: SSTConfig = {
  config(_input) {
    return {
      name: 'auth',
      region: 'us-west-2',
    };
  },
  stacks(app) {
    deploy.checkDeployment(app, { type: 'home-region-only' });

    app.stack(Main);
  },
};

export default config;
