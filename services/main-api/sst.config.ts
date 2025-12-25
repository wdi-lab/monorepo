import { SSTConfig } from 'sst';
import { Main } from './infra/Main.ts';

const config: SSTConfig = {
  config(_input) {
    return {
      name: 'main-api',
      region: 'us-west-2',
    };
  },
  stacks(app) {
    app.stack(Main);
  },
};

export default config;
