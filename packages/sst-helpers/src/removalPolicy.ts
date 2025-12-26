import { StackContext } from 'sst/constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { accountEnv, isPermanentStage } from './env.ts';

export const retainForPermanentStage = (context: StackContext) => {
  return isPermanentStage(context)
    ? RemovalPolicy.RETAIN
    : RemovalPolicy.DESTROY;
};

export const retainForProdEnvironment = (context: StackContext) => {
  return accountEnv(context) === 'PROD'
    ? RemovalPolicy.RETAIN
    : RemovalPolicy.DESTROY;
};
