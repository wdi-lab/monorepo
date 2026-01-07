import { StackContext } from 'sst/constructs';
import { Aws } from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

export interface GetCrossRegionParameterOptions {
  /**
   * The name of the SSM parameter to retrieve
   */
  parameterName: string;

  /**
   * The AWS region to retrieve the parameter from
   */
  region: string;

  /**
   * Optional logical ID for the custom resource construct.
   * If not provided, a unique ID will be generated based on the parameter name and region.
   */
  id?: string;

  /**
   * Optional scope for the custom resource.
   * Defaults to the stack.
   */
  scope?: Construct;
}

/**
 * Creates a custom resource to retrieve an SSM parameter value from a different region.
 *
 * This is useful when you need to read configuration values stored in SSM parameters
 * in a region different from where your stack is deployed.
 *
 * @example
 * // Get a certificate ARN stored in us-east-1
 * const certificateArn = getCrossRegionParameterValue(ctx, {
 *   parameterName: '/config/certificate/main/arn',
 *   region: 'us-east-1',
 * });
 *
 * @example
 * // With custom ID
 * const apiUrl = getCrossRegionParameterValue(ctx, {
 *   parameterName: '/service/auth/prod/api-url',
 *   region: 'eu-west-1',
 *   id: 'AuthApiUrlEuWest1',
 * });
 *
 * @returns The parameter value as a CloudFormation token string
 */
export const getCrossRegionParameterValue = (
  context: StackContext,
  options: GetCrossRegionParameterOptions
): string => {
  const { stack } = context;
  const { parameterName, region, scope } = options;

  // Generate a unique ID based on parameter name and region
  const sanitizedParamName = parameterName.replace(/[^a-zA-Z0-9]/g, '');
  const sanitizedRegion = region.replace(/-/g, '');
  const id =
    options.id ?? `CrossRegionSSM${sanitizedParamName}${sanitizedRegion}`;

  const customResource = new cr.AwsCustomResource(scope ?? stack, id, {
    resourceType: 'Custom::CrossRegionSSMParameter',
    onUpdate: {
      service: 'ssm',
      action: 'GetParameter',
      parameters: {
        Name: parameterName,
      },
      region,
      physicalResourceId: cr.PhysicalResourceId.of(
        `${parameterName}-${region}`
      ),
    },
    policy: cr.AwsCustomResourcePolicy.fromStatements([
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:${Aws.PARTITION}:ssm:${region}:${Aws.ACCOUNT_ID}:parameter${parameterName}`,
        ],
      }),
    ]),
  });

  return customResource.getResponseField('Parameter.Value');
};

/**
 * Returns the AwsCustomResource construct for more advanced use cases.
 * Use this when you need access to the construct itself, not just the value.
 *
 * @example
 * // Get the custom resource to add dependencies
 * const resource = getCrossRegionParameterResource(ctx, {
 *   parameterName: '/config/certificate/main/arn',
 *   region: 'us-east-1',
 * });
 * otherResource.node.addDependency(resource);
 * const value = resource.getResponseField('Parameter.Value');
 */
export const getCrossRegionParameterResource = (
  context: StackContext,
  options: GetCrossRegionParameterOptions
): cr.AwsCustomResource => {
  const { stack } = context;
  const { parameterName, region, scope } = options;

  // Generate a unique ID based on parameter name and region
  const sanitizedParamName = parameterName.replace(/[^a-zA-Z0-9]/g, '');
  const sanitizedRegion = region.replace(/-/g, '');
  const id =
    options.id ?? `CrossRegionSSM${sanitizedParamName}${sanitizedRegion}`;

  return new cr.AwsCustomResource(scope ?? stack, id, {
    resourceType: 'Custom::CrossRegionSSMParameter',
    onUpdate: {
      service: 'ssm',
      action: 'GetParameter',
      parameters: {
        Name: parameterName,
      },
      region,
      physicalResourceId: cr.PhysicalResourceId.of(
        `${parameterName}-${region}`
      ),
    },
    policy: cr.AwsCustomResourcePolicy.fromStatements([
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:${Aws.PARTITION}:ssm:${region}:${Aws.ACCOUNT_ID}:parameter${parameterName}`,
        ],
      }),
    ]),
  });
};
