/**
 * DynamoDB operations for Magic Link authentication
 */

import { createHash } from 'crypto';
import {
  DynamoDBClient,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { UserFacingError } from '../common.js';

// ============================================================================
// DynamoDB Client
// ============================================================================

const dynamoDbClient = new DynamoDBClient({
  ...(process.env.DYNAMODB_LOCAL_ENDPOINT && {
    endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT,
    sslEnabled: false,
    region: 'local-env',
    credentials: {
      accessKeyId: 'fakeMyKeyId',
      secretAccessKey: 'fakeSecretAccessKey',
    },
  }),
});

const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// ============================================================================
// Types
// ============================================================================

export interface MagicLinkRecord {
  userNameHash: Uint8Array;
  signatureHash: Uint8Array;
  exp: number;
  iat: number;
  kmsKeyId: string;
  uat?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create SHA-256 hash of a value with salt.
 *
 * @param salt - Salt to prepend to the value
 * @param value - Value to hash (string or Buffer)
 * @returns SHA-256 hash as Buffer
 */
function createSaltedHash(salt: string, value: string | Buffer): Buffer {
  return createHash('sha256').update(salt).update(value).digest();
}

// ============================================================================
// DynamoDB Operations
// ============================================================================

/**
 * Store a new magic link in DynamoDB with rate limiting.
 *
 * Rate limiting is enforced via conditional expression that checks if
 * a magic link was created less than `minimumSecondsBetween` seconds ago.
 *
 * @throws {UserFacingError} If rate limit is exceeded
 * @throws {Error} For other DynamoDB errors
 */
export async function storeMagicLink(params: {
  userName: string;
  signature: Buffer;
  iat: number;
  exp: number;
  kmsKeyId: string;
  salt: string;
  minimumSecondsBetween: number;
  tableName: string;
}): Promise<void> {
  const {
    userName,
    signature,
    iat,
    exp,
    kmsKeyId,
    salt,
    minimumSecondsBetween,
    tableName,
  } = params;

  // Create hashes for storage
  const userNameHash = createSaltedHash(salt, userName);
  const signatureHash = createSaltedHash(salt, signature);

  try {
    await ddbDocClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          userNameHash,
          signatureHash,
          iat,
          exp,
          kmsKeyId,
        },
        ConditionExpression: 'attribute_not_exists(#iat) or #iat < :iat',
        ExpressionAttributeNames: {
          '#iat': 'iat',
        },
        ExpressionAttributeValues: {
          ':iat': Math.floor(Date.now() / 1000) - minimumSecondsBetween,
        },
      })
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new UserFacingError(
        "We can't send you a magic link right now, please try again in a minute"
      );
    }
    throw err;
  }
}

/**
 * Verify and consume a magic link (one-time use).
 *
 * This operation atomically marks the magic link as used by setting the `uat`
 * (used at timestamp) attribute. If the link has already been used, the
 * conditional expression will fail and the function returns null.
 *
 * @returns The magic link record if valid and unused, null if already used or invalid
 * @throws {Error} For DynamoDB errors other than conditional check failures
 */
export async function verifyAndConsumeMagicLink(params: {
  userName: string;
  signature: Buffer;
  salt: string;
  tableName: string;
}): Promise<MagicLinkRecord | null> {
  const { userName, signature, salt, tableName } = params;

  // Create hashes for lookup
  const userNameHash = createSaltedHash(salt, userName);
  const signatureHash = createSaltedHash(salt, signature);

  const uat = Math.floor(Date.now() / 1000);

  try {
    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          userNameHash,
        },
        ReturnValues: 'ALL_OLD',
        UpdateExpression: 'SET #uat = :uat',
        ConditionExpression:
          'attribute_exists(#userNameHash) AND attribute_exists(#signatureHash) AND #signatureHash = :signatureHash AND attribute_not_exists(#uat)',
        ExpressionAttributeNames: {
          '#userNameHash': 'userNameHash',
          '#signatureHash': 'signatureHash',
          '#uat': 'uat',
        },
        ExpressionAttributeValues: {
          ':signatureHash': signatureHash,
          ':uat': uat,
        },
      })
    );

    // Validate the returned record
    const dbItem = result.Attributes;
    if (!dbItem) {
      return null;
    }

    assertIsMagicLinkRecord(dbItem);
    return dbItem;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      // Link is invalid, already used, or doesn't exist
      return null;
    }
    throw err;
  }
}

// ============================================================================
// Type Guards
// ============================================================================

function assertIsMagicLinkRecord(msg: unknown): asserts msg is MagicLinkRecord {
  if (
    !msg ||
    typeof msg !== 'object' ||
    !('userNameHash' in msg) ||
    !(msg.userNameHash instanceof Uint8Array) ||
    !('signatureHash' in msg) ||
    !(msg.signatureHash instanceof Uint8Array) ||
    !('exp' in msg) ||
    typeof msg.exp !== 'number' ||
    !('iat' in msg) ||
    typeof msg.iat !== 'number' ||
    !('kmsKeyId' in msg) ||
    typeof msg.kmsKeyId !== 'string' ||
    ('uat' in msg && typeof msg.uat !== 'number')
  ) {
    throw new Error('Invalid magic link record');
  }
}
