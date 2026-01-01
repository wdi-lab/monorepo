import { SSTConfig } from 'sst';

export default {
  config() {
    return {
      name: 'test-app',
      region: 'us-east-1',
    };
  },
  stacks() {},
} satisfies SSTConfig;
