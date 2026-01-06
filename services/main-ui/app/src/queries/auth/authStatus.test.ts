import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateRefetchInterval } from './authStatus';
import type { AuthStatus } from '~/providers/AuthProvider';

describe('calculateRefetchInterval', () => {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when data is undefined', () => {
    expect(calculateRefetchInterval(undefined)).toBe(false);
  });

  it('returns false when expiresAt is null', () => {
    const data: AuthStatus = {
      isAuthenticated: true,
      canRefresh: true,
      expiresAt: null,
      user: null,
    };
    expect(calculateRefetchInterval(data)).toBe(false);
  });

  it('returns false when canRefresh is false', () => {
    const data: AuthStatus = {
      isAuthenticated: true,
      canRefresh: false,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      user: null,
    };
    expect(calculateRefetchInterval(data)).toBe(false);
  });

  it('returns false when not authenticated', () => {
    const data: AuthStatus = {
      isAuthenticated: false,
      canRefresh: true,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      user: null,
    };
    expect(calculateRefetchInterval(data)).toBe(false);
  });

  it('returns interval based on time until refresh window', () => {
    // Mock Math.random to return 0.5 for predictable jitter (0.5 * 2 - 1 = 0, no jitter)
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
    const data: AuthStatus = {
      isAuthenticated: true,
      canRefresh: true,
      expiresAt: tenMinutesFromNow,
      user: null,
    };

    // Should be ~5 minutes (10 min until expiry - 5 min buffer)
    const interval = calculateRefetchInterval(data);
    expect(interval).toBe(FIVE_MINUTES_MS);
  });

  it('returns minimum interval (1 second) when already past refresh window', () => {
    const twoMinutesFromNow = Date.now() + 2 * 60 * 1000;
    const data: AuthStatus = {
      isAuthenticated: true,
      canRefresh: true,
      expiresAt: twoMinutesFromNow,
      user: null,
    };

    // 2 minutes until expiry, but refresh buffer is 5 minutes
    // So we're already past the refresh window, should return min interval
    const interval = calculateRefetchInterval(data);
    expect(interval).toBe(1000);
  });

  it('applies jitter to the interval', () => {
    // Test with random returning 0 (max negative jitter: -10%)
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const twentyMinutesFromNow = Date.now() + 20 * 60 * 1000;
    const data: AuthStatus = {
      isAuthenticated: true,
      canRefresh: true,
      expiresAt: twentyMinutesFromNow,
      user: null,
    };

    // Base interval: 20 min - 5 min = 15 min
    // Jitter at random=0: 15 min * 0.1 * (0 * 2 - 1) = -1.5 min
    // Result: 15 min - 1.5 min = 13.5 min
    const interval = calculateRefetchInterval(data);
    const expectedBase = 15 * 60 * 1000;
    const expectedJitter = expectedBase * 0.1 * -1;
    expect(interval).toBe(expectedBase + expectedJitter);
  });

  it('applies positive jitter when random is 1', () => {
    // Test with random returning 1 (max positive jitter: +10%)
    vi.spyOn(Math, 'random').mockReturnValue(1);

    const twentyMinutesFromNow = Date.now() + 20 * 60 * 1000;
    const data: AuthStatus = {
      isAuthenticated: true,
      canRefresh: true,
      expiresAt: twentyMinutesFromNow,
      user: null,
    };

    // Base interval: 20 min - 5 min = 15 min
    // Jitter at random=1: 15 min * 0.1 * (1 * 2 - 1) = +1.5 min
    // Result: 15 min + 1.5 min = 16.5 min
    const interval = calculateRefetchInterval(data);
    const expectedBase = 15 * 60 * 1000;
    const expectedJitter = expectedBase * 0.1 * 1;
    expect(interval).toBe(expectedBase + expectedJitter);
  });

  it('never returns less than minimum interval even with negative jitter', () => {
    // Even with max negative jitter, should not go below 1 second
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const fiveMinutesFromNow = Date.now() + FIVE_MINUTES_MS + 100; // Just past refresh window
    const data: AuthStatus = {
      isAuthenticated: true,
      canRefresh: true,
      expiresAt: fiveMinutesFromNow,
      user: null,
    };

    const interval = calculateRefetchInterval(data);
    expect(interval).toBeGreaterThanOrEqual(1000);
  });
});
