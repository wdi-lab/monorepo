import { describe, it, expect } from 'vitest';
import { call } from '@orpc/server';
import { router } from './router.ts';

describe('Auth Internal API Router', () => {
  describe('user.get', () => {
    it('should return user info for valid id', async () => {
      const id = 'test-user-123';

      const result = await call(router.user.get, { id });

      expect(result).toMatchObject({
        id,
        email: expect.any(String),
      });
    });
  });
});
