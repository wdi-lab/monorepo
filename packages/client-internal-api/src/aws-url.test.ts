import { describe, it, expect } from 'vitest';
import { extractAwsInfoFromUrl } from './aws-url.js';

describe('extractAwsInfoFromUrl', () => {
  describe('API Gateway URLs', () => {
    it('extracts region and service from standard API Gateway URL', () => {
      const url =
        'https://abc123def.execute-api.us-east-1.amazonaws.com/prod/users';
      const result = extractAwsInfoFromUrl(url);

      expect(result).toEqual({
        region: 'us-east-1',
        service: 'execute-api',
      });
    });

    it('extracts region from API Gateway URL with different regions', () => {
      const testCases = [
        {
          url: 'https://api.execute-api.eu-west-1.amazonaws.com/v1',
          expectedRegion: 'eu-west-1',
        },
        {
          url: 'https://xyz.execute-api.ap-southeast-2.amazonaws.com/',
          expectedRegion: 'ap-southeast-2',
        },
        {
          url: 'https://test.execute-api.us-gov-west-1.amazonaws.com/stage',
          expectedRegion: 'us-gov-west-1',
        },
      ];

      for (const { url, expectedRegion } of testCases) {
        const result = extractAwsInfoFromUrl(url);
        expect(result?.region).toBe(expectedRegion);
        expect(result?.service).toBe('execute-api');
      }
    });

    it('handles API Gateway URL with query parameters', () => {
      const url =
        'https://abc.execute-api.us-west-2.amazonaws.com/prod?foo=bar&baz=qux';
      const result = extractAwsInfoFromUrl(url);

      expect(result).toEqual({
        region: 'us-west-2',
        service: 'execute-api',
      });
    });
  });

  describe('Lambda Function URLs', () => {
    it('extracts region and service from Lambda Function URL', () => {
      const url =
        'https://abc123xyz.lambda-url.us-east-1.on.aws/path/to/resource';
      const result = extractAwsInfoFromUrl(url);

      expect(result).toEqual({
        region: 'us-east-1',
        service: 'lambda',
      });
    });

    it('extracts region from Lambda URL with different regions', () => {
      const testCases = [
        {
          url: 'https://func.lambda-url.eu-central-1.on.aws/',
          expectedRegion: 'eu-central-1',
        },
        {
          url: 'https://myfunction.lambda-url.ap-northeast-1.on.aws/api',
          expectedRegion: 'ap-northeast-1',
        },
        {
          url: 'https://test.lambda-url.sa-east-1.on.aws',
          expectedRegion: 'sa-east-1',
        },
      ];

      for (const { url, expectedRegion } of testCases) {
        const result = extractAwsInfoFromUrl(url);
        expect(result?.region).toBe(expectedRegion);
        expect(result?.service).toBe('lambda');
      }
    });

    it('handles Lambda Function URL with query parameters', () => {
      const url =
        'https://abc.lambda-url.us-west-2.on.aws/endpoint?param=value';
      const result = extractAwsInfoFromUrl(url);

      expect(result).toEqual({
        region: 'us-west-2',
        service: 'lambda',
      });
    });
  });

  describe('non-AWS URLs', () => {
    it('returns undefined for localhost URLs', () => {
      const url = 'http://localhost:3000/api/users';
      const result = extractAwsInfoFromUrl(url);

      expect(result).toBeUndefined();
    });

    it('returns undefined for custom domain URLs', () => {
      const url = 'https://api.example.com/v1/users';
      const result = extractAwsInfoFromUrl(url);

      expect(result).toBeUndefined();
    });

    it('returns undefined for other AWS service URLs', () => {
      const testCases = [
        'https://s3.us-east-1.amazonaws.com/bucket/key',
        'https://dynamodb.us-west-2.amazonaws.com/',
        'https://sqs.eu-west-1.amazonaws.com/queue',
      ];

      for (const url of testCases) {
        const result = extractAwsInfoFromUrl(url);
        expect(result).toBeUndefined();
      }
    });
  });

  describe('error handling', () => {
    it('returns undefined for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        '',
        'ftp://invalid',
        '://missing-protocol.com',
      ];

      for (const url of invalidUrls) {
        const result = extractAwsInfoFromUrl(url);
        expect(result).toBeUndefined();
      }
    });
  });
});
