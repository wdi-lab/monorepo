import { describe, expect, test } from 'vitest';
import { mainDomain, mainHostedZone } from './dns.ts';
import { AWS_ACCOUNTS, MAIN_HOSTED_ZONES } from './constants.ts';
import { StackContext } from 'sst/constructs';

describe('dns helpers', () => {
  describe('mainHostedZone', () => {
    test('should return dev hosted zone for dev account', () => {
      const mockContext = {
        app: { account: AWS_ACCOUNTS.DEV },
      } as StackContext;

      const result = mainHostedZone(mockContext);

      expect(result).toBe(MAIN_HOSTED_ZONES.DEV);
    });

    test('should return prod hosted zone for prod account', () => {
      const mockContext = {
        app: { account: AWS_ACCOUNTS.PROD },
      } as StackContext;

      const result = mainHostedZone(mockContext);

      expect(result).toBe(MAIN_HOSTED_ZONES.PROD);
    });

    test('should throw error for unknown account', () => {
      const unknownAccount = 'unknown-account-id';
      const mockContext = {
        app: { account: unknownAccount },
      } as StackContext;

      expect(() => mainHostedZone(mockContext)).toThrowError(
        `Unable to get main hosted zone for account ${unknownAccount}`
      );
    });
  });

  describe('mainDomain', () => {
    test('should return hosted zone for permanent stage in dev account', () => {
      const mockContext = {
        app: { account: AWS_ACCOUNTS.DEV, stage: 'DEV' },
      } as StackContext;

      const result = mainDomain(mockContext);

      expect(result).toBe(MAIN_HOSTED_ZONES.DEV);
    });

    test('should return hosted zone for permanent stage in prod account', () => {
      const mockContext = {
        app: { account: AWS_ACCOUNTS.PROD, stage: 'PROD' },
      } as StackContext;

      const result = mainDomain(mockContext);

      expect(result).toBe(MAIN_HOSTED_ZONES.PROD);
    });

    test('should return stage-prefixed domain for preview stage', () => {
      const mockContext = {
        app: { account: AWS_ACCOUNTS.DEV, stage: 'feature-123' },
      } as StackContext;

      const result = mainDomain(mockContext);

      expect(result).toBe(`feature-123.${MAIN_HOSTED_ZONES.DEV}`);
    });

    test('should handle case-insensitive DEV stage as permanent', () => {
      const mockContext = {
        app: { account: AWS_ACCOUNTS.DEV, stage: 'dev' },
      } as StackContext;

      const result = mainDomain(mockContext);

      expect(result).toBe(MAIN_HOSTED_ZONES.DEV);
    });
  });
});
