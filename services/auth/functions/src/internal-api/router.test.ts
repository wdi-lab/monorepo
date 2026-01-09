import { describe, it, expect } from 'vitest';
import { call } from '@orpc/server';
import { randomUUID } from 'node:crypto';
import { router } from './router.ts';
import {
  userRepository,
  UserNotFoundError,
} from '../db/main/user-repository.ts';

describe('Auth Internal API Router', () => {
  describe('user.get', () => {
    it('should return user info for valid id', async () => {
      // Create a user first
      const userData = {
        id: randomUUID(),
        email: `${randomUUID()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
      };
      await userRepository.create(userData);

      // Fetch the user via the router
      const result = await call(router.user.get, { id: userData.id });

      expect(result).toMatchObject({
        id: userData.id,
        email: userData.email,
      });
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      const nonExistentId = randomUUID();

      await expect(
        call(router.user.get, { id: nonExistentId })
      ).rejects.toThrow(UserNotFoundError);
    });
  });
});
