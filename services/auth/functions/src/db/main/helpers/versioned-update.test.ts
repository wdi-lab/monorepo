/**
 * Unit tests for the generic versioned update helper
 */

import { describe, it, expect, vi } from 'vitest';
import {
  versionedUpdate,
  OptimisticLockError,
  EntityNotFoundError,
} from './versioned-update.ts';

interface TestItem {
  id: string;
  name: string;
  version: number;
}

function createMockEntity(entityName = 'TestEntity') {
  const goMock = vi.fn();

  const entity = {
    schema: { model: { entity: entityName } },
    get: vi.fn().mockReturnValue({ go: goMock }),
    patch: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          go: goMock,
        }),
      }),
    }),
  };

  // Cast to any to allow mock to be passed as Entity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { entity: entity as any, goMock };
}

describe('versionedUpdate', () => {
  it('should update entity and increment version', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };
    const updatedEntity: TestItem = { id: '123', name: 'Updated', version: 2 };

    goMock
      .mockResolvedValueOnce({ data: currentEntity }) // get
      .mockResolvedValueOnce({ data: updatedEntity }); // patch

    const result = await versionedUpdate<TestItem>(
      entity,
      { id: '123' },
      () => ({ name: 'Updated' })
    );

    expect(result).toEqual(updatedEntity);
    expect(entity.get).toHaveBeenCalledWith({ id: '123' });
    expect(entity.patch).toHaveBeenCalledWith({ id: '123' });
  });

  it('should provide current entity to update function', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 5 };
    const updatedEntity: TestItem = {
      id: '123',
      name: 'Original-Modified',
      version: 6,
    };

    goMock
      .mockResolvedValueOnce({ data: currentEntity })
      .mockResolvedValueOnce({ data: updatedEntity });

    const updateFn = vi.fn((current: TestItem) => ({
      name: `${current.name}-Modified`,
    }));

    await versionedUpdate<TestItem>(entity, { id: '123' }, updateFn);

    expect(updateFn).toHaveBeenCalledWith(currentEntity);
  });

  it('should throw EntityNotFoundError when entity does not exist', async () => {
    const { entity, goMock } = createMockEntity();

    goMock.mockResolvedValue({ data: null });

    await expect(
      versionedUpdate<TestItem>(entity, { id: '123' }, () => ({
        name: 'Test',
      }))
    ).rejects.toThrow(EntityNotFoundError);

    await expect(
      versionedUpdate<TestItem>(entity, { id: '123' }, () => ({
        name: 'Test',
      }))
    ).rejects.toThrow('TestEntity not found');
  });

  it('should retry on ConditionalCheckFailed error', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };
    const updatedEntity: TestItem = { id: '123', name: 'Updated', version: 2 };

    goMock
      .mockResolvedValueOnce({ data: currentEntity }) // get (attempt 1)
      .mockRejectedValueOnce(new Error('ConditionalCheckFailed')) // patch (attempt 1)
      .mockResolvedValueOnce({ data: currentEntity }) // get (attempt 2)
      .mockResolvedValueOnce({ data: updatedEntity }); // patch (attempt 2)

    const result = await versionedUpdate<TestItem>(
      entity,
      { id: '123' },
      () => ({
        name: 'Updated',
      })
    );

    expect(result).toEqual(updatedEntity);
    expect(entity.get).toHaveBeenCalledTimes(2);
    expect(entity.patch).toHaveBeenCalledTimes(2);
  });

  it('should retry on conditional request failed error', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };
    const updatedEntity: TestItem = { id: '123', name: 'Updated', version: 2 };

    goMock
      .mockResolvedValueOnce({ data: currentEntity })
      .mockRejectedValueOnce(new Error('conditional request failed'))
      .mockResolvedValueOnce({ data: currentEntity })
      .mockResolvedValueOnce({ data: updatedEntity });

    const result = await versionedUpdate<TestItem>(
      entity,
      { id: '123' },
      () => ({
        name: 'Updated',
      })
    );

    expect(result).toEqual(updatedEntity);
  });

  it('should retry on error with ConditionalCheckFailedException cause', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };
    const updatedEntity: TestItem = { id: '123', name: 'Updated', version: 2 };

    const causeError = new Error('Conditional check');
    causeError.name = 'ConditionalCheckFailedException';
    const wrappedError = new Error('Wrapped error');
    wrappedError.cause = causeError;

    goMock
      .mockResolvedValueOnce({ data: currentEntity })
      .mockRejectedValueOnce(wrappedError)
      .mockResolvedValueOnce({ data: currentEntity })
      .mockResolvedValueOnce({ data: updatedEntity });

    const result = await versionedUpdate<TestItem>(
      entity,
      { id: '123' },
      () => ({
        name: 'Updated',
      })
    );

    expect(result).toEqual(updatedEntity);
  });

  it('should throw OptimisticLockError after max retries', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };

    // Alternate between get success and patch failure for 3 retries
    goMock
      .mockResolvedValueOnce({ data: currentEntity })
      .mockRejectedValueOnce(new Error('ConditionalCheckFailed'))
      .mockResolvedValueOnce({ data: currentEntity })
      .mockRejectedValueOnce(new Error('ConditionalCheckFailed'))
      .mockResolvedValueOnce({ data: currentEntity })
      .mockRejectedValueOnce(new Error('ConditionalCheckFailed'));

    await expect(
      versionedUpdate<TestItem>(
        entity,
        { id: '123' },
        () => ({ name: 'Updated' }),
        { maxRetries: 3 }
      )
    ).rejects.toThrow(OptimisticLockError);

    expect(entity.get).toHaveBeenCalledTimes(3);
    expect(entity.patch).toHaveBeenCalledTimes(3);
  });

  it('should use default maxRetries of 10', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };

    // Setup for 10 failures
    for (let i = 0; i < 10; i++) {
      goMock
        .mockResolvedValueOnce({ data: currentEntity })
        .mockRejectedValueOnce(new Error('ConditionalCheckFailed'));
    }

    await expect(
      versionedUpdate<TestItem>(entity, { id: '123' }, () => ({
        name: 'Updated',
      }))
    ).rejects.toThrow(OptimisticLockError);

    expect(entity.get).toHaveBeenCalledTimes(10);
    expect(entity.patch).toHaveBeenCalledTimes(10);
  });

  it('should re-throw non-conditional errors immediately', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };
    const customError = new Error('Some other database error');

    goMock
      .mockResolvedValueOnce({ data: currentEntity })
      .mockRejectedValueOnce(customError);

    await expect(
      versionedUpdate<TestItem>(entity, { id: '123' }, () => ({
        name: 'Updated',
      }))
    ).rejects.toThrow(customError);

    expect(entity.get).toHaveBeenCalledTimes(1);
    expect(entity.patch).toHaveBeenCalledTimes(1);
  });

  it('should retry with updated entity data on conflict', async () => {
    const { entity, goMock } = createMockEntity();

    const entity_v1: TestItem = { id: '123', name: 'Original', version: 1 };
    const entity_v2: TestItem = {
      id: '123',
      name: 'ConcurrentUpdate',
      version: 2,
    };
    const finalEntity: TestItem = { id: '123', name: 'OurUpdate', version: 3 };

    goMock
      .mockResolvedValueOnce({ data: entity_v1 }) // get (attempt 1)
      .mockRejectedValueOnce(new Error('ConditionalCheckFailed')) // patch (attempt 1)
      .mockResolvedValueOnce({ data: entity_v2 }) // get (attempt 2)
      .mockResolvedValueOnce({ data: finalEntity }); // patch (attempt 2)

    const result = await versionedUpdate<TestItem>(
      entity,
      { id: '123' },
      () => ({
        name: 'OurUpdate',
      })
    );

    expect(result).toEqual(finalEntity);
  });

  it('should support async updateFn', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };
    const updatedEntity: TestItem = {
      id: '123',
      name: 'AsyncUpdated',
      version: 2,
    };

    goMock
      .mockResolvedValueOnce({ data: currentEntity })
      .mockResolvedValueOnce({ data: updatedEntity });

    const result = await versionedUpdate<TestItem>(
      entity,
      { id: '123' },
      async () => {
        await Promise.resolve();
        return { name: 'AsyncUpdated' };
      }
    );

    expect(result).toEqual(updatedEntity);
  });

  it('should propagate errors from async updateFn', async () => {
    const { entity, goMock } = createMockEntity();

    const currentEntity: TestItem = { id: '123', name: 'Original', version: 1 };
    const customError = new Error('Async validation failed');

    goMock.mockResolvedValueOnce({ data: currentEntity });

    await expect(
      versionedUpdate<TestItem>(entity, { id: '123' }, async () => {
        throw customError;
      })
    ).rejects.toThrow(customError);

    expect(entity.patch).not.toHaveBeenCalled();
  });

  it('should extract entity name from schema', async () => {
    const { entity, goMock } = createMockEntity('User');

    goMock.mockResolvedValueOnce({ data: null });

    try {
      await versionedUpdate<TestItem>(entity, { id: '123' }, () => ({
        name: 'Test',
      }));
    } catch (error) {
      expect(error).toBeInstanceOf(EntityNotFoundError);
      expect((error as EntityNotFoundError).entityName).toBe('User');
    }
  });
});

describe('OptimisticLockError', () => {
  it('should contain entity name, keys, and max retries in message', () => {
    const error = new OptimisticLockError('User', { id: '123' }, 5);

    expect(error.name).toBe('OptimisticLockError');
    expect(error.entityName).toBe('User');
    expect(error.keys).toEqual({ id: '123' });
    expect(error.maxRetries).toBe(5);
    expect(error.message).toContain('User');
    expect(error.message).toContain('123');
    expect(error.message).toContain('5');
  });
});

describe('EntityNotFoundError', () => {
  it('should contain entity name and keys in message', () => {
    const error = new EntityNotFoundError('User', { id: '123' });

    expect(error.name).toBe('EntityNotFoundError');
    expect(error.entityName).toBe('User');
    expect(error.keys).toEqual({ id: '123' });
    expect(error.message).toContain('User');
    expect(error.message).toContain('123');
  });
});
