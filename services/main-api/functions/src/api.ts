import { type APIGatewayProxyHandlerV2 } from 'aws-lambda';
import serverlessExpress from 'serverless-http';
import express from 'express';

let serverlessExpressInstance: ReturnType<typeof serverlessExpress>;

const setupApp = () => {
  const app = express();
  app.get('/', (_req: express.Request, res: express.Response) => {
    res.send('Hello world!');
  });

  app.get('/test', (_req: express.Request, res: express.Response) => {
    res.send('Test');
  });

  return app;
};

const setup = async () => {
  if (!serverlessExpressInstance) {
    const app = setupApp();
    serverlessExpressInstance = serverlessExpress(app, {
      binary: ['image/*'],
    });
  }
  return serverlessExpressInstance;
};

export const handler: APIGatewayProxyHandlerV2<unknown> = async (
  event,
  context
) => {
  const expressHandler = await setup();
  return expressHandler(event, context);
};
