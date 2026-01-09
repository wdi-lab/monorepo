/**
 * Integration tests for User repository operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  UserRepository,
  UserNotFoundError,
  UserAlreadyExistsError,
} from './user-repository.ts';
import { UserEntity } from './entities/user.ts';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await repository.create(userData);

      expect(user.id).toBe(userData.id);
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
    });

    it('should create user with auto-generated ULID when id not provided', async () => {
      const userData = {
        email: `${randomUUID()}@example.com`,
        firstName: 'Auto',
        lastName: 'Generated',
      };

      const user = await repository.create(userData);

      expect(user.id).toBeDefined();
      expect(user.id).toHaveLength(26); // ULID length
      expect(user.email).toBe(userData.email);
    });

    it('should throw UserAlreadyExistsError when email exists', async () => {
      const email = `${randomUUID()}@example.com`;

      // Create first user
      await repository.create({
        id: randomUUID(),
        email,
        firstName: 'First',
        lastName: 'User',
      });

      // Try to create second user with same email
      await expect(
        repository.create({
          id: randomUUID(),
          email,
          firstName: 'Second',
          lastName: 'User',
        })
      ).rejects.toThrow(UserAlreadyExistsError);
    });

    it('should set default values for optional fields', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
      };

      const user = await repository.create(userData);

      expect(user.firstName).toBeUndefined();
      expect(user.lastName).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return user when found', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Get',
        lastName: 'ById',
      };

      await repository.create(userData);

      const user = await repository.getById(userData.id);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(userData.id);
      expect(user?.email).toBe(userData.email);
      expect(user?.firstName).toBe(userData.firstName);
      expect(user?.lastName).toBe(userData.lastName);
    });

    it('should return null when user not found', async () => {
      const user = await repository.getById(randomUUID());

      expect(user).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return user when email found', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Get',
        lastName: 'ByEmail',
      };

      await repository.create(userData);

      const user = await repository.getByEmail(userData.email);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(userData.id);
      expect(user?.email).toBe(userData.email);
    });

    it('should return null when email not found', async () => {
      const user = await repository.getByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Original',
        lastName: 'Name',
      };

      await repository.create(userData);

      const updated = await repository.update(userData.id, {
        firstName: 'Updated',
        lastName: 'Person',
      });

      expect(updated.firstName).toBe('Updated');
      expect(updated.lastName).toBe('Person');
      expect(updated.email).toBe(userData.email);
    });

    it('should throw UserNotFoundError when user does not exist', async () => {
      await expect(
        repository.update(randomUUID(), { firstName: 'New' })
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should throw UserAlreadyExistsError when updating to existing email', async () => {
      const user1Email = `${randomUUID()}@example.com`;
      const user2Email = `${randomUUID()}@example.com`;

      // Create two users
      const user1 = await repository.create({
        id: randomUUID(),
        email: user1Email,
        firstName: 'User',
        lastName: 'One',
      });

      await repository.create({
        id: randomUUID(),
        email: user2Email,
        firstName: 'User',
        lastName: 'Two',
      });

      // Try to update user1's email to user2's email
      await expect(
        repository.update(user1.id, { email: user2Email })
      ).rejects.toThrow(UserAlreadyExistsError);
    });
  });

  describe('findOrCreate', () => {
    it('should create new user when email does not exist', async () => {
      const email = `${randomUUID()}@example.com`;
      const userData = {
        firstName: 'New',
        lastName: 'User',
      };

      const result = await repository.findOrCreate(email, userData);

      expect(result.created).toBe(true);
      expect(result.user.email).toBe(email);
      expect(result.user.id).toBeDefined();
      expect(result.user.id).toHaveLength(26); // ULID length
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);
    });

    it('should return existing user when email exists', async () => {
      const email = `${randomUUID()}@example.com`;
      const originalUserData = {
        id: randomUUID(),
        email,
        firstName: 'Original',
        lastName: 'User',
      };

      await repository.create(originalUserData);

      const result = await repository.findOrCreate(email, {
        firstName: 'New',
        lastName: 'Person',
      });

      expect(result.created).toBe(false);
      expect(result.user.id).toBe(originalUserData.id);
      expect(result.user.firstName).toBe(originalUserData.firstName);
      expect(result.user.lastName).toBe(originalUserData.lastName);
    });

    it('should create user with minimal data', async () => {
      const email = `${randomUUID()}@example.com`;

      const result = await repository.findOrCreate(email, {});

      expect(result.created).toBe(true);
      expect(result.user.email).toBe(email);
      expect(result.user.firstName).toBeUndefined();
      expect(result.user.lastName).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete an existing user', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Delete',
        lastName: 'Me',
      };

      await repository.create(userData);

      // Verify user exists
      const beforeDelete = await repository.getById(userData.id);
      expect(beforeDelete).not.toBeNull();

      // Delete user
      await repository.delete(userData.id);

      // Verify user is deleted
      const afterDelete = await repository.getById(userData.id);
      expect(afterDelete).toBeNull();
    });

    it('should not throw when deleting non-existent user', async () => {
      await expect(repository.delete(randomUUID())).resolves.toBeUndefined();
    });
  });

  describe('addCognitoUser', () => {
    it('should add Cognito user entry to a user', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Cognito',
        lastName: 'User',
      };

      await repository.create(userData);

      const cognitoEntry = {
        userPoolId: 'us-east-1_ABC123',
        sub: 'cognito-sub-123',
        region: 'us-east-1',
      };

      const updated = await repository.addCognitoUser(
        userData.id,
        cognitoEntry
      );

      expect(updated.cognitoUsers).toEqual([cognitoEntry]);
    });

    it('should add multiple Cognito user entries', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Multi',
        lastName: 'Region',
      };

      await repository.create(userData);

      const cognitoEntry1 = {
        userPoolId: 'us-east-1_ABC123',
        sub: 'cognito-sub-123',
        region: 'us-east-1',
      };
      const cognitoEntry2 = {
        userPoolId: 'eu-west-1_XYZ789',
        sub: 'cognito-sub-456',
        region: 'eu-west-1',
      };

      await repository.addCognitoUser(userData.id, cognitoEntry1);
      const updated = await repository.addCognitoUser(
        userData.id,
        cognitoEntry2
      );

      expect(updated.cognitoUsers).toEqual([cognitoEntry1, cognitoEntry2]);
    });

    it('should not duplicate existing Cognito user entry', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'No',
        lastName: 'Duplicate',
      };

      await repository.create(userData);

      const cognitoEntry = {
        userPoolId: 'us-east-1_ABC123',
        sub: 'cognito-sub-123',
        region: 'us-east-1',
      };

      await repository.addCognitoUser(userData.id, cognitoEntry);
      const updated = await repository.addCognitoUser(
        userData.id,
        cognitoEntry
      );

      // Should still only have one entry
      expect(updated.cognitoUsers).toHaveLength(1);
      expect(updated.cognitoUsers?.[0]).toEqual(cognitoEntry);
    });

    it('should not override existing entry when same userPoolId with different sub', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Preserve',
        lastName: 'Original',
      };

      await repository.create(userData);

      const originalEntry = {
        userPoolId: 'us-east-1_ABC123',
        sub: 'original-sub-123',
        region: 'us-east-1',
      };

      const newEntryWithSamePoolId = {
        userPoolId: 'us-east-1_ABC123',
        sub: 'different-sub-456',
        region: 'us-east-1',
      };

      await repository.addCognitoUser(userData.id, originalEntry);
      const updated = await repository.addCognitoUser(
        userData.id,
        newEntryWithSamePoolId
      );

      // Should still only have one entry with the ORIGINAL sub preserved
      expect(updated.cognitoUsers).toHaveLength(1);
      expect(updated.cognitoUsers?.[0]).toEqual(originalEntry);
      expect(updated.cognitoUsers?.[0]?.sub).toBe('original-sub-123');
    });

    it('should throw UserNotFoundError when user does not exist', async () => {
      const cognitoEntry = {
        userPoolId: 'us-east-1_ABC123',
        sub: 'cognito-sub-123',
        region: 'us-east-1',
      };

      await expect(
        repository.addCognitoUser(randomUUID(), cognitoEntry)
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('emailVerified', () => {
    it('should default emailVerified to false when creating user', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Email',
        lastName: 'Unverified',
      };

      const user = await repository.create(userData);

      expect(user.emailVerified).toBe(false);
    });

    it('should allow creating user with emailVerified set to true', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Email',
        lastName: 'Verified',
        emailVerified: true,
      };

      const user = await repository.create(userData);

      expect(user.emailVerified).toBe(true);
    });
  });

  describe('setEmailVerified', () => {
    it('should set emailVerified to true', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Verify',
        lastName: 'Me',
      };

      await repository.create(userData);

      const updated = await repository.setEmailVerified(userData.id, true);

      expect(updated.emailVerified).toBe(true);
    });

    it('should set emailVerified to false', async () => {
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Unverify',
        lastName: 'Me',
        emailVerified: true,
      };

      await repository.create(userData);

      const updated = await repository.setEmailVerified(userData.id, false);

      expect(updated.emailVerified).toBe(false);
    });

    it('should throw UserNotFoundError when user does not exist', async () => {
      await expect(
        repository.setEmailVerified(randomUUID(), true)
      ).rejects.toThrow(UserNotFoundError);
    });
  });
});

describe('UserEntity', () => {
  it('should generate correct pk/sk for user', async () => {
    const userId = randomUUID();
    const email = `${randomUUID()}@example.com`;

    const params = UserEntity.create({
      id: userId,
      email,
      firstName: 'Test',
      lastName: 'User',
    }).params();

    // Verify the key structure follows single-table design
    expect(params.Item?.pk).toContain(userId);
    expect(params.Item?.sk).toContain(userId);
  });

  it('should generate correct gsi1pk/gsi1sk for email lookup', async () => {
    const userId = randomUUID();
    const email = `${randomUUID()}@example.com`;

    const params = UserEntity.create({
      id: userId,
      email,
      firstName: 'Test',
      lastName: 'User',
    }).params();

    // Verify GSI1 key structure for email lookup
    expect(params.Item?.gsi1pk).toContain(email);
    expect(params.Item?.gsi1sk).toContain(email);
  });
});
