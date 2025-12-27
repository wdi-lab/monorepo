import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { dns } from '@lib/sst-helpers';

export class AccountDNSStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const mainHostedZoneName = dns.mainHostedZone({
      app: { account: this.account },
      stack: this,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const _mainHostedZone = new cdk.aws_route53.PublicHostedZone(
      this,
      'MainHostedZone',
      { zoneName: mainHostedZoneName }
    );
  }
}
