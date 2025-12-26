import { describe, it, expect } from 'vitest';
import { RemovalPolicy } from 'aws-cdk-lib';
import {
  retainForPermanentStage,
  retainForProdEnvironment,
} from './removalPolicy.ts';
import { AWS_ACCOUNTS } from './constants.ts';
import type { StackContext } from 'sst/constructs';

describe('removalPolicy helpers', () => {
  describe('retainForPermanentStage', () => {
    it('should return RETAIN for DEV account with dev stage (permanent)', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'dev',
        },
      } as StackContext;

      expect(retainForPermanentStage(mockContext)).toBe(RemovalPolicy.RETAIN);
    });

    it('should return RETAIN for DEV account with DEV stage (permanent)', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'DEV',
        },
      } as StackContext;

      expect(retainForPermanentStage(mockContext)).toBe(RemovalPolicy.RETAIN);
    });

    it('should return DESTROY for DEV account with feature branch (preview)', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'feature-branch',
        },
      } as StackContext;

      expect(retainForPermanentStage(mockContext)).toBe(RemovalPolicy.DESTROY);
    });

    it('should return DESTROY for DEV account with pr stage (preview)', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'pr-123',
        },
      } as StackContext;

      expect(retainForPermanentStage(mockContext)).toBe(RemovalPolicy.DESTROY);
    });

    it('should return RETAIN for PROD account with production stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'production',
        },
      } as StackContext;

      expect(retainForPermanentStage(mockContext)).toBe(RemovalPolicy.RETAIN);
    });

    it('should return RETAIN for PROD account with any stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'feature-branch',
        },
      } as StackContext;

      expect(retainForPermanentStage(mockContext)).toBe(RemovalPolicy.RETAIN);
    });

    it('should return RETAIN for PROD account with dev stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'dev',
        },
      } as StackContext;

      expect(retainForPermanentStage(mockContext)).toBe(RemovalPolicy.RETAIN);
    });
  });

  describe('retainForProdEnvironment', () => {
    it('should return DESTROY for DEV account with dev stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'dev',
        },
      } as StackContext;

      expect(retainForProdEnvironment(mockContext)).toBe(RemovalPolicy.DESTROY);
    });

    it('should return DESTROY for DEV account with any stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'production',
        },
      } as StackContext;

      expect(retainForProdEnvironment(mockContext)).toBe(RemovalPolicy.DESTROY);
    });

    it('should return DESTROY for DEV account with feature branch', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.DEV,
          stage: 'feature-branch',
        },
      } as StackContext;

      expect(retainForProdEnvironment(mockContext)).toBe(RemovalPolicy.DESTROY);
    });

    it('should return RETAIN for PROD account with production stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'production',
        },
      } as StackContext;

      expect(retainForProdEnvironment(mockContext)).toBe(RemovalPolicy.RETAIN);
    });

    it('should return RETAIN for PROD account with dev stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'dev',
        },
      } as StackContext;

      expect(retainForProdEnvironment(mockContext)).toBe(RemovalPolicy.RETAIN);
    });

    it('should return RETAIN for PROD account with any stage', () => {
      const mockContext = {
        app: {
          account: AWS_ACCOUNTS.PROD,
          stage: 'staging',
        },
      } as StackContext;

      expect(retainForProdEnvironment(mockContext)).toBe(RemovalPolicy.RETAIN);
    });
  });
});
