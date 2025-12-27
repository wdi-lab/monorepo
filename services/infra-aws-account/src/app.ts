#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { regions } from '@lib/sst-helpers';
import { AccountDNSStack } from './stacks/dns.ts';

const app = new cdk.App();

const region = regions.getHomeRegion(); // process.env.CDK_DEFAULT_REGION
const account = process.env.CDK_DEFAULT_ACCOUNT;

new AccountDNSStack(app, 'AccountDNS', {
  env: { account, region },
  description: 'AWS Account shared DNS stack',
});

app.synth();
