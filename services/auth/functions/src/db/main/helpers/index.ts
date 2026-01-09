/**
 * Database helpers
 *
 * Re-exports helper utilities for database operations.
 */

export {
  versionedUpdate,
  OptimisticLockError,
  EntityNotFoundError,
  type VersionedUpdateOptions,
} from './versioned-update.ts';
