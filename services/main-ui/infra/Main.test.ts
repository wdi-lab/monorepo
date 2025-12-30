/**
 * Infrastructure tests for Main UI Stack
 *
 * Tests verify that the NitroSite construct creates the necessary AWS resources
 * for hosting the TanStack Start application with proper security, performance,
 * and integration configurations.
 *
 * Key infrastructure components tested:
 * - CloudFront distribution with HTTPS redirect and cache configuration
 * - S3 bucket with security best practices (public access blocking)
 * - Lambda function with API Gateway for server-side rendering
 * - IAM roles and policies for S3 access and CloudFront invalidation
 * - Stack outputs for external reference
 */
import { describe, it, beforeAll } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { initProject } from 'sst/project.js';
import { App, getStack } from 'sst/constructs';
import { Main } from './Main.ts';

describe('Main UI Stack', () => {
  beforeAll(async () => {
    await initProject({});
  });

  it('should create CloudFront distribution with S3 bucket and security configuration', async () => {
    const app = new App({ mode: 'deploy' });
    app.stack(Main);

    await app.finish();

    const template = Template.fromStack(getStack(Main));

    // Group: CloudFront distribution with HTTPS redirect and cache behaviors
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          Enabled: true,
          // Verify origins are configured (S3 and API Gateway)
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: Match.anyValue(),
            }),
          ]),
          // Verify HTTPS redirect and cache behaviors
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: Match.stringLikeRegexp(
              'redirect-to-https|https-only'
            ),
            TargetOriginId: Match.anyValue(),
            Compress: true,
            AllowedMethods: Match.anyValue(),
            CachedMethods: Match.anyValue(),
          }),
        }),
      })
    );

    // Group: S3 bucket with security best practices
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      })
    );
    // Note: S3 bucket encryption is not explicitly configured by NitroSite construct.
    // AWS S3 applies default encryption (SSE-S3) if not specified, but best practice
    // is to explicitly configure encryption in IaC.
  });

  it('should create Lambda function with API Gateway for server-side rendering', async () => {
    const app = new App({ mode: 'deploy' });
    app.stack(Main);

    await app.finish();

    const template = Template.fromStack(getStack(Main));

    // Group: Lambda function configuration
    template.hasResourceProperties(
      'AWS::Lambda::Function',
      Match.objectLike({
        Runtime: Match.stringLikeRegexp('nodejs'),
        Handler: Match.stringLikeRegexp('index.handler'),
        Description: Match.stringLikeRegexp('Server handler'),
      })
    );

    // Group: API Gateway integration
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.hasResourceProperties(
      'AWS::ApiGateway::RestApi',
      Match.objectLike({
        EndpointConfiguration: Match.objectLike({
          Types: ['REGIONAL'],
        }),
      })
    );

    template.hasResourceProperties(
      'AWS::ApiGateway::Method',
      Match.objectLike({
        HttpMethod: 'ANY',
      })
    );
  });

  it('should configure IAM permissions for S3 and CloudFront invalidation', async () => {
    const app = new App({ mode: 'deploy' });
    app.stack(Main);

    await app.finish();

    const template = Template.fromStack(getStack(Main));

    // Group: IAM role with Lambda trust policy
    template.hasResourceProperties(
      'AWS::IAM::Role',
      Match.objectLike({
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: Match.objectLike({
                Service: 'lambda.amazonaws.com',
              }),
              Action: 'sts:AssumeRole',
            }),
          ]),
        }),
      })
    );

    // Group: S3 access permissions
    template.hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([Match.stringLikeRegexp('s3:GetObject')]),
              Effect: 'Allow',
            }),
          ]),
        }),
      })
    );

    // Group: CloudFront invalidation permissions
    template.hasResourceProperties(
      'AWS::IAM::Policy',
      Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'cloudfront:CreateInvalidation',
              Effect: 'Allow',
              Resource: Match.objectLike({
                'Fn::Join': Match.arrayWith([
                  Match.arrayWith([
                    Match.stringLikeRegexp('arn:'),
                    Match.stringLikeRegexp('cloudfront'),
                  ]),
                ]),
              }),
            }),
          ]),
        }),
      })
    );
  });

  it('should export MainSiteUrl as stack output', async () => {
    const app = new App({ mode: 'deploy' });
    app.stack(Main);

    await app.finish();

    const template = Template.fromStack(getStack(Main));

    // Verify stack output exists
    template.hasOutput('MainSiteUrl', {});
  });
});
