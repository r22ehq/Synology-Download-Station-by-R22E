import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshCoordinator } from '../../../../src/core/platform/scheduler/refresh-coordinator';

describe('RefreshCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('coalesces multiple simultaneous requests into a single fetch', async () => {
    const fetchFn = vi.fn().mockImplementation(async (id: string) => {
      return new Promise(resolve => setTimeout(() => resolve(`result-${id}`), 100));
    });

    const coordinator = new RefreshCoordinator(fetchFn, 2000);

    // Request 10 times simultaneously
    const promises = Array.from({ length: 10 }).map(() => coordinator.requestRefresh('profile1'));
    
    vi.advanceTimersByTime(150);
    
    const results = await Promise.all(promises);

    // All should get the same result
    expect(results).toEqual(Array(10).fill('result-profile1'));
    
    // The fetch should only have been called ONCE
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('serves from cache if within minFreshnessMs', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data');
    const coordinator = new RefreshCoordinator(fetchFn, 2000);

    await coordinator.requestRefresh('profile1');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Advance by 1 second (less than 2000ms freshness limit)
    vi.advanceTimersByTime(1000);
    
    await coordinator.requestRefresh('profile1');
    // Fetch should not be called again
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Advance by 1.5 seconds (total 2.5s -> cache is stale)
    vi.advanceTimersByTime(1500);

    await coordinator.requestRefresh('profile1');
    // Fetch should be called again
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('isolates state per profile', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data');
    const coordinator = new RefreshCoordinator(fetchFn, 2000);

    await Promise.all([
      coordinator.requestRefresh('profile1'),
      coordinator.requestRefresh('profile2')
    ]);

    // Should fetch twice because they are different profiles
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn).toHaveBeenCalledWith('profile1');
    expect(fetchFn).toHaveBeenCalledWith('profile2');
  });
});
