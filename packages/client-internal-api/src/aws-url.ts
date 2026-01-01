export interface AwsUrlInfo {
  region: string;
  service: string;
}

/**
 * Extract AWS region and service from API Gateway or Lambda URL hostname.
 * Supports formats:
 * - {api-id}.execute-api.{region}.amazonaws.com (API Gateway) -> service: 'execute-api'
 * - {function-url-id}.lambda-url.{region}.on.aws (Lambda Function URL) -> service: 'lambda'
 */
export function extractAwsInfoFromUrl(url: string): AwsUrlInfo | undefined {
  try {
    const hostname = new URL(url).hostname;

    // API Gateway: {api-id}.execute-api.{region}.amazonaws.com
    const apiGatewayMatch = hostname.match(
      /\.execute-api\.([a-z0-9-]+)\.amazonaws\.com$/
    );
    if (apiGatewayMatch) {
      return { region: apiGatewayMatch[1], service: 'execute-api' };
    }

    // Lambda Function URL: {function-url-id}.lambda-url.{region}.on.aws
    const lambdaUrlMatch = hostname.match(
      /\.lambda-url\.([a-z0-9-]+)\.on\.aws$/
    );
    if (lambdaUrlMatch) {
      return { region: lambdaUrlMatch[1], service: 'lambda' };
    }

    return undefined;
  } catch {
    return undefined;
  }
}
