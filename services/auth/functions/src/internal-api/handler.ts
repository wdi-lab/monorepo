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

const parseJSON = (text: Buffer | null | undefined): unknown => {
  const asString = text?.toString().trim();
  if (!asString) {
    return undefined;
  }

  return JSON.parse(asString);
};

const jsonBodyParser: express.RequestHandler = (req, _res, next) => {
  if (
    req.headers['content-type'] === 'application/json' ||
    !req.headers['content-type']
  ) {
    req.body = parseJSON(req.body);
  }
  next();
};

const setupApp = () => {
  const app = express();

  app.use('*', jsonBodyParser, async (req, res, next) => {
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
