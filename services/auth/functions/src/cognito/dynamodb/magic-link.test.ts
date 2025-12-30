/**
 * Integration tests for DynamoDB magic link operations
 */

import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { storeMagicLink, verifyAndConsumeMagicLink } from './magic-link.ts';

const TEST_TABLE_NAME = 'MagicLinks'; // Ensure this matches the table created in global setup

describe('DynamoDB Magic Link Operations', () => {
  it('should store a magic link in DynamoDB', async () => {
    const params = {
      userName: `${randomUUID()}@example.com`,
      signature: Buffer.from('test-signature'),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      kmsKeyId: 'test-key-id',
      salt: 'test-salt',
      minimumSecondsBetween: 60,
      tableName: TEST_TABLE_NAME,
    };

    await expect(storeMagicLink(params)).resolves.toBeUndefined();
  });

  it('should enforce rate limiting when storing magic links', async () => {
    const params = {
      userName: `${randomUUID()}@example.com`,
      signature: Buffer.from('test-signature'),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      kmsKeyId: 'test-key-id',
      salt: 'test-salt',
      minimumSecondsBetween: 60,
      tableName: TEST_TABLE_NAME,
    };

    // First call should succeed
    await storeMagicLink(params);

    // Second call within rate limit should fail
    await expect(storeMagicLink(params)).rejects.toThrow(
      "We can't send you a magic link right now"
    );
  });

  it('should verify and consume a magic link', async () => {
    const userName = `${randomUUID()}@example.com`;
    const signature = Buffer.from('verify-signature');
    const salt = 'test-salt';
    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.floor(Date.now() / 1000) + 900;

    // Store a magic link first
    await storeMagicLink({
      userName,
      signature,
      iat,
      exp,
      kmsKeyId: 'test-key-id',
      salt,
      minimumSecondsBetween: 0,
      tableName: TEST_TABLE_NAME,
    });

    // Verify and consume it
    const result = await verifyAndConsumeMagicLink({
      userName,
      signature,
      salt,
      tableName: TEST_TABLE_NAME,
    });

    expect(result).toBeDefined();
    expect(result?.exp).toBe(exp);
    expect(result?.iat).toBe(iat);
    expect(result?.kmsKeyId).toBe('test-key-id');
  });

  it('should prevent reuse of consumed magic links', async () => {
    const userName = `${randomUUID()}@example.com`;
    const signature = Buffer.from('oneuse-signature');
    const salt = 'test-salt';

    // Store a magic link
    await storeMagicLink({
      userName,
      signature,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      kmsKeyId: 'test-key-id',
      salt,
      minimumSecondsBetween: 0,
      tableName: TEST_TABLE_NAME,
    });

    // First use should succeed
    const firstResult = await verifyAndConsumeMagicLink({
      userName,
      signature,
      salt,
      tableName: TEST_TABLE_NAME,
    });
    expect(firstResult).toBeDefined();

    // Second use should fail (already consumed)
    const secondResult = await verifyAndConsumeMagicLink({
      userName,
      signature,
      salt,
      tableName: TEST_TABLE_NAME,
    });
    expect(secondResult).toBeNull();
  });

  it('should return null for non-existent magic links', async () => {
    const result = await verifyAndConsumeMagicLink({
      userName: `${randomUUID()}@example.com`,
      signature: Buffer.from('nonexistent'),
      salt: 'test-salt',
      tableName: TEST_TABLE_NAME,
    });

    expect(result).toBeNull();
  });
});
