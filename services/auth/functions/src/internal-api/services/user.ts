/**
 * User Service
 *
 * Handles user management operations shared across authentication flows.
 * Ensures users exist in both the application database and Cognito.
 * Tracks which Cognito user pools a user exists in across regions.
 */

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'crypto';
import { userRepository } from '../../db/main/user-repository.ts';
import type { User } from '../../db/main/entities/user.ts';

// ============================================================================
// Types
// ============================================================================

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  clientSecret: string;
  /** AWS region where the user pool is located (extracted from userPoolId if not provided) */
  region?: string;
}

export interface UserInfo {
  firstName?: string;
  lastName?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract AWS region from Cognito User Pool ID
 * User Pool IDs are in the format: <region>_<id> (e.g., "us-east-1_ABC123")
 */
function extractRegionFromUserPoolId(userPoolId: string): string {
  const match = userPoolId.match(/^([a-z]{2}-[a-z]+-\d+)_/);
  if (!match) {
    throw new Error(`Invalid User Pool ID format: ${userPoolId}`);
  }
  return match[1];
}

// ============================================================================
// Service
// ============================================================================

export class UserService {
  private cognito: CognitoIdentityProviderClient;
  private cognitoConfig: CognitoConfig;
  private region: string;

  constructor(cognitoConfig: CognitoConfig) {
    this.cognitoConfig = cognitoConfig;
    this.region =
      cognitoConfig.region ??
      extractRegionFromUserPoolId(cognitoConfig.userPoolId);
    this.cognito = new CognitoIdentityProviderClient({ region: this.region });
  }

  /**
   * Find existing user or create new user in both DB and Cognito
   *
   * This method ensures the user exists in both systems:
   * 1. Finds or creates user in the application database (by email)
   * 2. Ensures they exist in Cognito (and tracks the user pool)
   *
   * @param email - User's email address
   * @param userInfo - Optional user info for new user creation
   * @returns The user from the database
   */
  async findOrCreateUser(email: string, userInfo?: UserInfo): Promise<User> {
    const { user } = await userRepository.findOrCreate(email, {
      firstName: userInfo?.firstName,
      lastName: userInfo?.lastName,
    });

    await this.ensureCognitoUser(user);

    return user;
  }

  /**
   * Mark user's email as verified in the database
   *
   * Called after successful authentication via magic link or social login.
   *
   * @param idOrEmail - User's ID or email address
   */
  async setEmailVerified(idOrEmail: string): Promise<void> {
    const user = idOrEmail.includes('@')
      ? await userRepository.getByEmail(idOrEmail)
      : await userRepository.getById(idOrEmail);

    if (user && !user.emailVerified) {
      await userRepository.setEmailVerified(user.id, true);
    }
  }

  /**
   * Ensure user exists in Cognito, create if not.
   * Also tracks the Cognito user pool in the user's record.
   *
   * Uses the DB user ID as the Cognito username for consistent lookup/creation.
   *
   * @param user - The DB user object
   */
  private async ensureCognitoUser(user: User): Promise<void> {
    const { userPoolId } = this.cognitoConfig;
    const { id: userId, email, cognitoUsers } = user;

    // Check if we already track this user pool for this user (no DB call needed)
    const alreadyTracked = cognitoUsers?.some(
      (entry) => entry.userPoolId === userPoolId
    );

    if (alreadyTracked) {
      return;
    }

    try {
      // Look up by userId (which is the Cognito username)
      const response = await this.cognito.send(
        new AdminGetUserCommand({
          UserPoolId: userPoolId,
          Username: userId,
        })
      );

      // User exists in Cognito - extract sub and track
      const sub = response.UserAttributes?.find(
        (attr) => attr.Name === 'sub'
      )?.Value;
      if (!sub) {
        throw new Error('Cognito user missing sub attribute');
      }

      await userRepository.addCognitoUser(userId, {
        userPoolId,
        sub,
        region: this.region,
      });
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        // Create in Cognito and track
        const sub = await this.createCognitoUser(userId, email);
        await userRepository.addCognitoUser(userId, {
          userPoolId,
          sub,
          region: this.region,
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Create a new user in Cognito with a random password
   *
   * Uses the DB user ID as Cognito username and sets email as an attribute.
   * Password is random since we use custom auth flows (magic link, social).
   *
   * Cognito email_verified is always set to 'true' since we control user creation
   * through verified flows. DB emailVerified is tracked separately and updated
   * upon successful login.
   *
   * @param userId - The DB user's unique identifier (used as Cognito username)
   * @param email - The user's email address
   * @returns The Cognito user's sub (unique identifier)
   */
  private async createCognitoUser(
    userId: string,
    email: string
  ): Promise<string> {
    const createResponse = await this.cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: this.cognitoConfig.userPoolId,
        Username: userId,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        MessageAction: 'SUPPRESS',
      })
    );

    const sub = createResponse.User?.Attributes?.find(
      (attr) => attr.Name === 'sub'
    )?.Value;
    if (!sub) {
      throw new Error('Failed to get sub from created Cognito user');
    }

    const randomPassword = randomUUID() + 'Aa1!';
    await this.cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: this.cognitoConfig.userPoolId,
        Username: userId,
        Password: randomPassword,
        Permanent: true,
      })
    );

    return sub;
  }
}
