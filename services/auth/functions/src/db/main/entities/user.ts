/**
 * User Entity - ElectroDB model for user data
 *
 * Stores user information in the main DynamoDB table using single-table design.
 * Users are identified by their unique ID and can be queried by email.
 *
 * Access Patterns:
 * - Get user by ID: pk = "USER#<id>", sk = "USER#<id>"
 * - Get user by email: gsi1pk = "USER_EMAIL#<email>", gsi1sk = "USER_EMAIL#<email>"
 */

import { Entity, type EntityItem, type CreateEntityItem } from 'electrodb';
import { ulid } from 'ulid';
import { dynamoDBClient } from '../client.ts';
import { getMainTableName, tableConfig } from '../table.ts';

/**
 * Represents a Cognito user pool entry for a user.
 * Contains the user pool ID, Cognito sub, and region.
 */
export interface CognitoUserEntry {
  /** The Cognito User Pool ID (e.g., "us-east-1_ABC123") */
  userPoolId: string;
  /** The Cognito user's sub (unique identifier within the user pool) */
  sub: string;
  /** The AWS region where the user pool is located */
  region: string;
}

/**
 * User entity schema definition.
 *
 * Follows single-table design patterns with:
 * - Primary index for direct user lookup by ID
 * - GSI1 for email-based lookups (unique constraint enforced at application level)
 */
export const UserEntity = new Entity(
  {
    model: {
      entity: 'user',
      version: '1',
      service: 'auth',
    },
    attributes: {
      /**
       * Unique user identifier (ULID, auto-generated if not provided)
       */
      id: {
        type: 'string',
        required: true,
        default: () => ulid(),
      },
      /**
       * User's email address (unique)
       */
      email: {
        type: 'string',
        required: true,
      },
      /**
       * User's first name
       */
      firstName: {
        type: 'string',
      },
      /**
       * User's last name
       */
      lastName: {
        type: 'string',
      },
      /**
       * Version number for optimistic locking.
       * Starts at 1 and increments on each update.
       */
      version: {
        type: 'number',
        required: true,
        default: 1,
      },
      /**
       * Whether the user's email has been verified.
       * Defaults to false, set to true when verified through magic link or trusted provider.
       */
      emailVerified: {
        type: 'boolean',
        required: true,
        default: false,
      },
      /**
       * List of Cognito user pools where this user exists.
       * Each entry contains userPoolId, sub, and region.
       */
      cognitoUsers: {
        type: 'list',
        items: {
          type: 'map',
          properties: {
            userPoolId: { type: 'string', required: true },
            sub: { type: 'string', required: true },
            region: { type: 'string', required: true },
          },
        },
        default: [],
      },
    },
    indexes: {
      /**
       * Primary index for user lookup by ID
       *
       * pk: USER#<id>
       * sk: USER#<id>
       */
      byId: {
        pk: {
          field: tableConfig.pk,
          composite: ['id'],
        },
        sk: {
          field: tableConfig.sk,
          composite: ['id'],
        },
      },
      /**
       * GSI for user lookup by email
       *
       * gsi1pk: USER_EMAIL#<email>
       * gsi1sk: USER_EMAIL#<email>
       */
      byEmail: {
        index: tableConfig.gsi1IndexName,
        pk: {
          field: tableConfig.gsi1pk,
          composite: ['email'],
        },
        sk: {
          field: tableConfig.gsi1sk,
          composite: ['email'],
        },
      },
    },
  },
  { client: dynamoDBClient, table: getMainTableName() }
);

/**
 * Type representing a User item from the database
 */
export type User = EntityItem<typeof UserEntity>;

/**
 * Type for creating a new User (excludes auto-generated fields)
 */
export type CreateUser = CreateEntityItem<typeof UserEntity>;
