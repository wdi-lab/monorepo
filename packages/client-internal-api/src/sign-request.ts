import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type {
  AwsCredentialIdentity,
  Provider,
  ChecksumConstructor,
  HashConstructor,
} from '@smithy/types';
import { extractAwsInfoFromUrl } from './aws-url.js';

export interface AwsSignatureV4Options {
  /**
   * AWS credentials to use for signing requests.
   * @default defaultProvider() - uses the default AWS credential provider chain
   */
  credentials?: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;

  /**
   * AWS region for the service.
   * @default Auto-detected from URL for API Gateway/Lambda URLs, falls back to process.env.AWS_REGION
   */
  region?: string;

  /**
   * AWS service name (e.g., 'execute-api' for API Gateway, 'lambda' for Lambda function URLs).
   * @default Auto-detected from URL for API Gateway/Lambda URLs, falls back to 'execute-api'
   */
  service?: string;

  /**
   * SHA-256 hash constructor.
   * @default Sha256 from @aws-crypto/sha256-js
   */
  sha256?: ChecksumConstructor | HashConstructor;
}

/**
 * Sign a request using AWS Signature V4
 */
export async function signRequest(
  request: Request,
  sigv4Options: AwsSignatureV4Options
): Promise<Request> {
  const {
    credentials = defaultProvider(),
    region: explicitRegion,
    service: explicitService,
    sha256 = Sha256,
  } = sigv4Options;

  // Auto-detect region and service from URL
  const urlInfo = extractAwsInfoFromUrl(request.url);

  // Determine region: explicit > URL-based > environment
  const region = explicitRegion || urlInfo?.region || process.env.AWS_REGION;

  // Determine service: explicit > URL-based > default 'execute-api'
  const service = explicitService || urlInfo?.service || 'execute-api';

  if (!region) {
    throw new Error(
      'AWS region is required for signing. Set AWS_REGION environment variable, ' +
        'provide region in awsSignatureV4 options, or use a standard AWS URL format.'
    );
  }

  const signer = new SignatureV4({
    credentials,
    region,
    service,
    sha256,
  });

  const url = new URL(request.url);
  const body = request.body ? await request.text() : undefined;

  // Build headers for signing - ensure host header is present
  const headersToSign: Record<string, string> = {
    host: url.hostname,
    ...Object.fromEntries(request.headers.entries()),
  };

  const signedRequest = await signer.sign({
    method: request.method,
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port ? parseInt(url.port) : undefined,
    path: url.pathname + url.search,
    headers: headersToSign,
    body,
  });

  const signedHeaders = new Headers();
  for (const [key, value] of Object.entries(signedRequest.headers)) {
    signedHeaders.set(key, value);
  }

  return new Request(request.url, {
    method: request.method,
    headers: signedHeaders,
    body,
  });
}
