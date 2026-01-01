import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signRequest } from './sign-request.js';

const mockSign = vi.fn();

// Mock the SignatureV4 class - must use function to make it a constructor
vi.mock('@smithy/signature-v4', () => ({
  SignatureV4: vi.fn(function () {
    return {
      sign: mockSign,
    };
  }),
}));

// Mock the default provider
vi.mock('@aws-sdk/credential-provider-node', () => ({
  defaultProvider: vi.fn().mockReturnValue(() =>
    Promise.resolve({
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    })
  ),
}));

describe('signRequest', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };

    // Default mock implementation
    mockSign.mockResolvedValue({
      method: 'POST',
      headers: {
        host: 'api.execute-api.us-east-1.amazonaws.com',
        'content-type': 'application/json',
        'x-amz-date': '20240101T000000Z',
        authorization: 'AWS4-HMAC-SHA256 Credential=...',
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('region detection', () => {
    it('uses explicit region over URL-detected region', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const request = new Request(
        'https://api.execute-api.us-east-1.amazonaws.com/prod',
        {
          method: 'GET',
        }
      );

      await signRequest(request, { region: 'eu-west-1' });

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'eu-west-1',
        })
      );
    });

    it('auto-detects region from API Gateway URL', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const request = new Request(
        'https://api.execute-api.ap-southeast-2.amazonaws.com/prod',
        {
          method: 'GET',
        }
      );

      await signRequest(request, {});

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'ap-southeast-2',
        })
      );
    });

    it('auto-detects region from Lambda Function URL', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const request = new Request(
        'https://func.lambda-url.eu-central-1.on.aws/api',
        {
          method: 'GET',
        }
      );

      await signRequest(request, {});

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'eu-central-1',
        })
      );
    });

    it('falls back to AWS_REGION env var when URL detection fails', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      process.env.AWS_REGION = 'us-west-2';

      const request = new Request('https://api.example.com/endpoint', {
        method: 'GET',
      });

      await signRequest(request, {});

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-west-2',
        })
      );
    });

    it('throws error when no region can be determined', async () => {
      delete process.env.AWS_REGION;

      const request = new Request('https://api.example.com/endpoint', {
        method: 'GET',
      });

      await expect(signRequest(request, {})).rejects.toThrow(
        'AWS region is required for signing'
      );
    });
  });

  describe('service detection', () => {
    it('uses explicit service over URL-detected service', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const request = new Request(
        'https://api.execute-api.us-east-1.amazonaws.com/prod',
        {
          method: 'GET',
        }
      );

      await signRequest(request, { service: 'custom-service' });

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
    });

    it('auto-detects execute-api service from API Gateway URL', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const request = new Request(
        'https://api.execute-api.us-east-1.amazonaws.com/prod',
        {
          method: 'GET',
        }
      );

      await signRequest(request, {});

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'execute-api',
        })
      );
    });

    it('auto-detects lambda service from Lambda Function URL', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const request = new Request(
        'https://func.lambda-url.us-east-1.on.aws/api',
        {
          method: 'GET',
        }
      );

      await signRequest(request, {});

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'lambda',
        })
      );
    });

    it('defaults to execute-api when service cannot be detected', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      process.env.AWS_REGION = 'us-east-1';

      const request = new Request('https://api.example.com/endpoint', {
        method: 'GET',
      });

      await signRequest(request, {});

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'execute-api',
        })
      );
    });
  });

  describe('request signing', () => {
    it('returns a new Request with signed headers', async () => {
      const request = new Request(
        'https://api.execute-api.us-east-1.amazonaws.com/prod',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foo: 'bar' }),
        }
      );

      const signedRequest = await signRequest(request, {});

      expect(signedRequest).toBeInstanceOf(Request);
      expect(signedRequest.headers.get('authorization')).toBe(
        'AWS4-HMAC-SHA256 Credential=...'
      );
      expect(signedRequest.headers.get('x-amz-date')).toBe('20240101T000000Z');
    });

    it('preserves the original URL', async () => {
      const url = 'https://api.execute-api.us-east-1.amazonaws.com/prod/users';
      const request = new Request(url, { method: 'GET' });

      const signedRequest = await signRequest(request, {});

      expect(signedRequest.url).toBe(url);
    });

    it('preserves the original method', async () => {
      mockSign.mockResolvedValue({
        method: 'DELETE',
        headers: { host: 'api.execute-api.us-east-1.amazonaws.com' },
      });

      const request = new Request(
        'https://api.execute-api.us-east-1.amazonaws.com/prod',
        {
          method: 'DELETE',
        }
      );

      const signedRequest = await signRequest(request, {});

      expect(signedRequest.method).toBe('DELETE');
    });

    it('includes host header for signing', async () => {
      const request = new Request(
        'https://api.execute-api.us-east-1.amazonaws.com/prod',
        {
          method: 'GET',
        }
      );

      await signRequest(request, {});

      expect(mockSign).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            host: 'api.execute-api.us-east-1.amazonaws.com',
          }),
        })
      );
    });
  });

  describe('credentials', () => {
    it('uses provided credentials', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const customCredentials = {
        accessKeyId: 'CUSTOM_ACCESS_KEY',
        secretAccessKey: 'CUSTOM_SECRET_KEY',
      };

      const request = new Request(
        'https://api.execute-api.us-east-1.amazonaws.com/prod',
        {
          method: 'GET',
        }
      );

      await signRequest(request, { credentials: customCredentials });

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: customCredentials,
        })
      );
    });

    it('uses default provider when no credentials provided', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const { defaultProvider } =
        await import('@aws-sdk/credential-provider-node');

      const request = new Request(
        'https://api.execute-api.us-east-1.amazonaws.com/prod',
        {
          method: 'GET',
        }
      );

      await signRequest(request, {});

      expect(defaultProvider).toHaveBeenCalled();
      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: expect.any(Function),
        })
      );
    });
  });
});
