import { describe, it, expect } from 'vitest';
import { accountEnv, isPreviewStage, isPermanentStage } from './env.ts';
import { AWS_ACCOUNTS } from './constants.ts';
import type { StackContext } from 'sst/constructs';

describe('env helpers', () => {
  describe('accountEnv', () => {
    it('should return DEV for DEV account', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
        },
      } as StackContext;

      expect(accountEnv(mockContext)).toBe('DEV');
    });

    it('should return PROD for PROD account', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
        },
      } as StackContext;

      expect(accountEnv(mockContext)).toBe('PROD');
    });

    it('should throw error for unknown account', () => {
      const mockContext = {
        app: {
          account: 'non-existent-account',
        },
      } as StackContext;

      expect(() => accountEnv(mockContext)).toThrow(
        'Unable to get env name for account non-existent-account'
      );
    });

    it('should throw error for undefined account', () => {
      const mockContext = {
        app: {
          account: undefined,
        },
      } as unknown as StackContext;

      expect(() => accountEnv(mockContext)).toThrow(
        'Unable to get env name for account undefined'
      );
    });

    it('should handle numeric account ID', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
        },
      } as StackContext;

      expect(accountEnv(mockContext)).toBe('DEV');
    });
  });

  describe('integration tests', () => {
    it('should correctly identify preview stages across different scenarios', () => {
      const scenarios = [
        {
          account: AWS_ACCOUNTS.DEV,
          stage: 'dev',
          expected: false,
          description: 'DEV account with dev stage',
        },
        {
          account: AWS_ACCOUNTS.DEV,
          stage: 'pr-123',
          expected: true,
          description: 'DEV account with PR stage',
        },
        {
          account: AWS_ACCOUNTS.DEV,
          stage: 'hotfix',
          expected: true,
          description: 'DEV account with hotfix stage',
        },
        {
          account: AWS_ACCOUNTS.PROD,
          stage: 'prod',
          expected: false,
          description: 'PROD account with prod stage',
        },
        {
          account: AWS_ACCOUNTS.PROD,
          stage: 'dev',
          expected: false,
          description: 'PROD account with dev stage',
        },
      ];

      scenarios.forEach(({ account, stage, expected }) => {
        const mockContext = {
          app: { account, stage },
        } as StackContext;

        expect(isPreviewStage(mockContext)).toBe(expected);
      });
    });
  });

  describe('isPreviewStage', () => {
    it('should return true for DEV account with non-dev stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'feature-branch',
        },
      } as StackContext;

      expect(isPreviewStage(mockContext)).toBe(true);
    });

    it('should return true for DEV account with staging stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'staging',
        },
      } as StackContext;

      expect(isPreviewStage(mockContext)).toBe(true);
    });

    it('should return false for DEV account with dev stage (lowercase)', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'dev',
        },
      } as StackContext;

      expect(isPreviewStage(mockContext)).toBe(false);
    });

    it('should return false for PROD account with dev stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'dev',
        },
      } as StackContext;

      expect(isPreviewStage(mockContext)).toBe(false);
    });

    it('should return false for PROD account with prod stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'prod',
        },
      } as StackContext;

      expect(isPreviewStage(mockContext)).toBe(false);
    });

    it('should return false for PROD account with any stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'feature-branch',
        },
      } as StackContext;

      expect(isPreviewStage(mockContext)).toBe(false);
    });

    it('should throw error for unknown account when checking preview stage', () => {
      const mockContext = {
        app: {
          account: '999999999999',
          stage: 'feature-branch',
        },
      } as StackContext;

      expect(() => isPreviewStage(mockContext)).toThrow(
        'Unable to get env name for account 999999999999'
      );
    });
  });

  describe('isPermanentStage', () => {
    it('should return false for DEV account with non-dev stage (preview)', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'feature-branch',
        },
      } as StackContext;

      expect(isPermanentStage(mockContext)).toBe(false);
    });

    it('should return true for DEV account with dev stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'dev',
        },
      } as StackContext;

      expect(isPermanentStage(mockContext)).toBe(true);
    });

    it('should return true for PROD account with any stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'production',
        },
      } as StackContext;

      expect(isPermanentStage(mockContext)).toBe(true);
    });

    it('should throw error for unknown account', () => {
      const mockContext = {
        app: {
          account: 'non-existent-account',
          stage: 'dev',
        },
      } as StackContext;

      expect(() => isPermanentStage(mockContext)).toThrow(
        'Unable to get env name for account non-existent-account'
      );
    });
  });
});
