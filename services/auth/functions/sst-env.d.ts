import type {} from '../.sst/types/index';

declare module 'sst/node/config' {
  export interface ParameterResources {
    COGNITO_USER_POOL_ID: {
      value: string;
    };
    COGNITO_CLIENT_ID: {
      value: string;
    };
  }

  export interface SecretResources {
    SOCIAL_GOOGLE_CLIENT_ID: {
      value: string;
    };
    SOCIAL_GOOGLE_CLIENT_SECRET: {
      value: string;
    };
  }

  export interface GlobalTableResources {
    mainTable: {
      tableName: string;
    };
  }
}
