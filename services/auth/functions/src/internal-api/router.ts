import { implement } from '@orpc/server';
import { contract } from '@contract/internal-api/auth';

/**
 * Implement the auth contract's getUser procedure
 */
const getUser = implement(contract.user.get).handler(async ({ input }) => {
  // TODO: Implement actual user lookup logic
  return {
    id: input.id,
    email: 'user@example.com',
  };
});

/**
 * Auth service internal API router implementing the contract
 */
export const router = {
  user: {
    get: getUser,
  },
};

export type Router = typeof router;
