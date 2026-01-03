import type {} from '../.sst/types/index';

declare module 'sst/node/site' {
  export interface NitroSiteResources {
    MainSite: {
      url: string;
    };
  }

  export const NitroSite: NitroSiteResources;
}

declare module 'sst/node/config' {
  export interface ServiceConfigResources {
    AuthInternalApiUrl: {
      value: string;
    };
  }
}
