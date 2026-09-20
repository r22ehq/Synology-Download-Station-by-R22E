import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, any> = {};

vi.mock('wxt/utils/storage', () => {
  return {
    storage: {
      defineItem: vi.fn((key: string, options: any) => ({
        getValue: vi.fn().mockImplementation(async () => {
          return store[key] !== undefined ? JSON.parse(JSON.stringify(store[key])) : JSON.parse(JSON.stringify(options.defaultValue));
        }),
        setValue: vi.fn().mockImplementation(async (val: any) => {
          store[key] = JSON.parse(JSON.stringify(val));
        }),
        removeValue: vi.fn().mockImplementation(async () => {
          delete store[key];
        })
      })),
    }
  };
});

import { removeProfileData, profilesStorage, sessionDataStorage, activeProfileIdStorage, getTrackerStorageItem } from '../../../../src/core/platform/storage/storage-items';

describe('removeProfileData', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('should clean all profile-scoped data', async () => {
    // Setup state
    await profilesStorage.setValue([{ id: 'p1', name: 'Profile 1' } as any, { id: 'p2', name: 'Profile 2' } as any]);
    await activeProfileIdStorage.setValue('p1');
    await sessionDataStorage.setValue({
      'p1': { sid: 'sid1' },
      'p2': { sid: 'sid2' }
    });
    const tracker = getTrackerStorageItem('p1');
    await tracker.setValue({ tasks: { 't1': 'finished' } });

    // Execute cleanup
    await removeProfileData('p1');

    // Verify profiles removed
    const profiles = await profilesStorage.getValue();
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.id).toBe('p2');

    // Verify active profile reset
    expect(await activeProfileIdStorage.getValue()).toBeNull();

    // Verify session removed
    const sessions = await sessionDataStorage.getValue();
    expect(sessions['p1']).toBeUndefined();
    expect(sessions['p2']).toBeDefined();

    // Verify tracker removed
    expect(store['session:taskTracker_p1']).toBeUndefined();
  });
});
