/**
 * Generic Versioned Update Helper
 *
 * Provides optimistic locking functionality for any ElectroDB entity that has a `version` field.
 * Uses conditional updates to ensure data integrity during concurrent modifications.
 */

import type { Entity } from 'electrodb';

/**
 * Error thrown when optimistic locking fails after max retries
 */
export class OptimisticLockError extends Error {
  constructor(
    public readonly entityName: string,
    public readonly keys: Record<string, unknown>,
    public readonly maxRetries: number
  ) {
    super(
      `Failed to update ${entityName} with keys ${JSON.stringify(keys)} after ${maxRetries} attempts due to concurrent modifications`
    );
    this.name = 'OptimisticLockError';
  }
}

/**
 * Error thrown when entity is not found during versioned update
 */
export class EntityNotFoundError extends Error {
  constructor(
    public readonly entityName: string,
    public readonly keys: Record<string, unknown>
  ) {
    super(`${entityName} not found with keys: ${JSON.stringify(keys)}`);
    this.name = 'EntityNotFoundError';
  }
}

/**
 * Configuration options for versioned update
 */
export interface VersionedUpdateOptions {
  /** Maximum number of retry attempts on version conflict (default: 10) */
  maxRetries?: number;
}

/**
 * Check if an error is a DynamoDB conditional check failure
 */
function isConditionalCheckFailed(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes('ConditionalCheckFailed') ||
    error.message.includes('conditional request failed') ||
    (error.cause instanceof Error &&
      error.cause.name === 'ConditionalCheckFailedException')
  );
}

/**
 * Entity item type with required version field
 */
type VersionedItem = { version: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEntity = Entity<any, any, any, any>;

/**
 * Perform a versioned update with optimistic locking on an ElectroDB entity.
 *
 * This function:
 * 1. Retrieves the current record by primary key
 * 2. Calls updateFn with the current record to compute updates
 * 3. Increments the version field
 * 4. Attempts update with a condition that version matches
 * 5. Retries on version conflict up to maxRetries times
 *
 * @param entity - ElectroDB entity instance (must have version field)
 * @param keys - Primary key(s) to find the entity
 * @param updateFn - Function that receives current entity and returns partial updates (can be async)
 * @param options - Optional configuration (maxRetries)
 * @returns Updated entity
 * @throws {EntityNotFoundError} If entity doesn't exist
 * @throws {OptimisticLockError} If update fails after max retries
 *
 * @example
 * ```typescript
 * const updated = await versionedUpdate(
 *   UserEntity,
 *   { id: userId },
 *   (user) => ({ firstName: 'NewName' })
 * );
 * ```
 */
export async function versionedUpdate<TItem extends VersionedItem>(
  entity: AnyEntity,
  keys: Record<string, unknown>,
  updateFn: (current: TItem) => Partial<TItem> | Promise<Partial<TItem>>,
  options: VersionedUpdateOptions = {}
): Promise<TItem> {
  const { maxRetries = 10 } = options;
  const entityName = entity.schema.model.entity;

  return versionedUpdateInternal(
    entity,
    entityName,
    keys,
    updateFn,
    maxRetries,
    0
  );
}

/**
 * Internal recursive implementation of versionedUpdate
 */
async function versionedUpdateInternal<TItem extends VersionedItem>(
  entity: AnyEntity,
  entityName: string,
  keys: Record<string, unknown>,
  updateFn: (current: TItem) => Partial<TItem> | Promise<Partial<TItem>>,
  maxRetries: number,
  attempt: number
): Promise<TItem> {
  // Get current entity
  const result = await entity.get(keys).go();
  const current = result.data as TItem | null;

  if (!current) {
    throw new EntityNotFoundError(entityName, keys);
  }

  // Apply update function to get the changes (supports async)
  const updates = await updateFn(current);

  const currentVersion = current.version;
  const newVersion = currentVersion + 1;

  try {
    // Attempt update with version condition
    const patchResult = await entity
      .patch(keys)
      .set({ ...updates, version: newVersion })
      .where((attributes, operations) =>
        operations.eq(attributes.version, currentVersion)
      )
      .go({ response: 'all_new' });

    return patchResult.data as TItem;
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      // Retry if we haven't exceeded max attempts
      if (attempt < maxRetries - 1) {
        return versionedUpdateInternal(
          entity,
          entityName,
          keys,
          updateFn,
          maxRetries,
          attempt + 1
        );
      }
      // Max retries exceeded
      throw new OptimisticLockError(entityName, keys, maxRetries);
    }
    // Re-throw other errors
    throw error;
  }
}
