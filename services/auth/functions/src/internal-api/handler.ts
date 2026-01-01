import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import serverlessExpress from 'serverless-http';
import express from 'express';
import { OpenAPIHandler } from '@orpc/openapi/node';
import { onError } from '@orpc/server';
import { router } from './router.ts';

const openApiHandler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error('OpenAPI Error:', error);
    }),
  ],
});

let serverlessExpressInstance: ReturnType<typeof serverlessExpress>;

const setupApp = () => {
  const app = express();

  app.use('*', async (req, res, next) => {
    const { matched } = await openApiHandler.handle(req, res, {
      prefix: '/auth',
      context: {},
    });

    if (matched) {
      return;
    }

    next();
  });

  return app;
};

const setup = async () => {
  if (!serverlessExpressInstance) {
    const app = setupApp();
    serverlessExpressInstance = serverlessExpress(app, {});
  }
  return serverlessExpressInstance;
};

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  const expressHandler = await setup();
  return expressHandler(event, context);
};
