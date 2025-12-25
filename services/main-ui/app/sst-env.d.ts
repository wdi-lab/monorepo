import type {} from '../.sst/types/index';

declare module 'sst/node/site' {
  export interface NitroSiteResources {
    MainSite: {
      url: string;
    };
  }

  export const NitroSite: NitroSiteResources;
}
