import { oc } from '@orpc/contract';
import * as z from 'zod';

const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
});

/**
 * Contract for getting user info by ID
 */
export const getUser = oc
  .route({ method: 'GET', path: '/users/{id}' })
  .input(UserSchema.pick({ id: true }))
  .output(UserSchema);

/**
 * Internal API contract router
 */
export const contract = {
  user: {
    get: getUser,
  },
};

export type Contract = typeof contract;
