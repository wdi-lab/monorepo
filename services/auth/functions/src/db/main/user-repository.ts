/**
 * User Repository - Database operations for User entity
 *
 * Provides a clean interface for user CRUD operations using ElectroDB.
 * All operations handle ElectroDB-specific errors and return appropriate results.
 */

import {
  UserEntity,
  type User,
  type CreateUser,
  type CognitoUserEntry,
} from './entities/user.ts';
import { versionedUpdate, EntityNotFoundError } from './helpers/index.ts';

/**
 * Error thrown when a user is not found
 */
export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Error thrown when a user already exists (email uniqueness violation)
 */
export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email already exists: ${email}`);
    this.name = 'UserAlreadyExistsError';
  }
}

/**
 * User Repository class for database operations
 */
export class UserRepository {
  /**
   * Get a user by their unique ID
   *
   * @param id - User's unique identifier
   * @returns User if found, null otherwise
   */
  async getById(id: string): Promise<User | null> {
    const result = await UserEntity.get({ id }).go();
    return result.data ?? null;
  }

  /**
   * Get a user by their email address
   *
   * @param email - User's email address
   * @returns User if found, null otherwise
   */
  async getByEmail(email: string): Promise<User | null> {
    const result = await UserEntity.query.byEmail({ email }).go();
    return result.data[0] ?? null;
  }

  /**
   * Create a new user
   *
   * @param userData - User data to create
   * @returns Created user
   * @throws {UserAlreadyExistsError} If a user with the same email already exists
   */
  async create(userData: CreateUser): Promise<User> {
    // Check if user with email already exists
    const existingUser = await this.getByEmail(userData.email);
    if (existingUser) {
      throw new UserAlreadyExistsError(userData.email);
    }

    const result = await UserEntity.create(userData).go();
    return result.data;
  }

  /**
   * Update an existing user
   * Uses optimistic locking (versionedUpdate) to handle concurrent modifications safely.
   *
   * @param id - User's unique identifier
   * @param updates - Partial user data to update
   * @returns Updated user
   * @throws {UserNotFoundError} If user doesn't exist
   * @throws {UserAlreadyExistsError} If email is being changed to one that already exists
   */
  async update(
    id: string,
    updates: Partial<Omit<CreateUser, 'id'>>
  ): Promise<User> {
    try {
      return await versionedUpdate(UserEntity, { id }, async (currentUser) => {
        // If email is being changed, check for uniqueness
        if (updates.email && updates.email !== currentUser.email) {
          const userWithEmail = await this.getByEmail(updates.email);
          if (userWithEmail) {
            throw new UserAlreadyExistsError(updates.email);
          }
        }

        return updates;
      });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new UserNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Find or create a user by email
   *
   * Useful for authentication flows where a user may or may not exist.
   * Looks up by email and creates with that email if not found.
   *
   * @param email - User's email address
   * @param userData - Additional user data for creation (firstName, lastName, etc.)
   * @returns Object containing user and whether it was created
   */
  async findOrCreate(
    email: string,
    userData: Omit<CreateUser, 'email'>
  ): Promise<{ user: User; created: boolean }> {
    const existingUser = await this.getByEmail(email);
    if (existingUser) {
      return { user: existingUser, created: false };
    }

    // Create new user with the provided email
    const user = await this.create({ ...userData, email });
    return { user, created: true };
  }

  /**
   * Delete a user by ID
   *
   * @param id - User's unique identifier
   */
  async delete(id: string): Promise<void> {
    await UserEntity.delete({ id }).go();
  }

  /**
   * Add a Cognito user pool entry to a user's cognitoUsers array.
   * Uses optimistic locking (versionedUpdate) to handle concurrent modifications safely.
   *
   * @param id - User's unique identifier
   * @param cognitoEntry - Cognito user pool information (userPoolId, sub, region)
   * @returns Updated user
   * @throws {UserNotFoundError} If user doesn't exist
   */
  async addCognitoUser(
    id: string,
    cognitoEntry: CognitoUserEntry
  ): Promise<User> {
    try {
      return await versionedUpdate(UserEntity, { id }, (currentUser) => {
        const cognitoUsers = currentUser.cognitoUsers ?? [];

        // If already tracked (same userPoolId), return empty update (no-op)
        if (
          cognitoUsers.some(
            (entry) => entry.userPoolId === cognitoEntry.userPoolId
          )
        ) {
          return {};
        }

        // Add new entry to array
        return {
          cognitoUsers: [...cognitoUsers, cognitoEntry],
        };
      });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new UserNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Set the email verified status for a user.
   * Uses optimistic locking (versionedUpdate) to handle concurrent modifications safely.
   *
   * @param id - User's unique identifier
   * @param verified - Whether the email is verified
   * @returns Updated user
   * @throws {UserNotFoundError} If user doesn't exist
   */
  async setEmailVerified(id: string, verified: boolean): Promise<User> {
    try {
      return await versionedUpdate(UserEntity, { id }, (_currentUser) => {
        return { emailVerified: verified };
      });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new UserNotFoundError(id);
      }
      throw error;
    }
  }
}

/**
 * Singleton instance of UserRepository
 */
export const userRepository = new UserRepository();

// Re-export types for convenience
export type { CognitoUserEntry } from './entities/user.ts';
