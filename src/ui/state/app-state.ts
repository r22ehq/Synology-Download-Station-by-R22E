import { signal, computed } from '@preact/signals';
import {
  activeProfileIdStorage,
  profilesStorage,
  settingsStorage,
} from '@/core/platform/storage/storage-items';
import type { NasProfile, AppSettings } from '@/core/platform/storage/storage-items';

// Global state signals
export const profiles = signal<NasProfile[]>([]);
export const activeProfileId = signal<string | null>(null);
export const settings = signal<AppSettings | null>(null);
export const isReady = signal<boolean>(false);

// Computed derived state
export const activeProfile = computed(() => {
  if (!activeProfileId.value || !profiles.value.length) return null;
  return profiles.value.find((p) => p.id === activeProfileId.value) || null;
});

export type ConnectionState = 
  | 'unknown' 
  | 'connecting' 
  | 'waiting-for-2fa'
  | 'authenticated' 
  | 'validating' 
  | 'ready' 
  | 'session-expired' 
  | 'permission-denied' 
  | 'nas-unreachable' 
  | 'authentication-failed' 
  | 'download-station-unavailable';

export interface AuthState {
  status: ConnectionState;
  activeProfileId: string | null;
}

// Initialization
let initialized = false;

export const initAppState = async () => {
  if (initialized) return;
  initialized = true;

  // Load initial values
  const [initialProfiles, initialActiveId, initialSettings] = await Promise.all([
    profilesStorage.getValue(),
    activeProfileIdStorage.getValue(),
    settingsStorage.getValue(),
  ]);

  profiles.value = initialProfiles || [];
  activeProfileId.value = initialActiveId;
  settings.value = initialSettings;
  isReady.value = true;

  // Watch for storage changes across contexts (popup, sidepanel, options)
  profilesStorage.watch((newValue: NasProfile[] | null) => {
    profiles.value = newValue || [];
  });

  activeProfileIdStorage.watch((newValue: string | null) => {
    activeProfileId.value = newValue;
  });

  settingsStorage.watch((newValue: AppSettings | null) => {
    if (newValue) {
      settings.value = newValue;
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = newValue.theme || 'system';
      }
    }
  });

  if (initialSettings && typeof document !== 'undefined') {
    document.documentElement.dataset.theme = initialSettings.theme || 'system';
  }
};

// Actions
export const addProfile = async (profile: Omit<NasProfile, 'id'>) => {
  const newProfile: NasProfile = {
    ...profile,
    id: crypto.randomUUID(),
  };

  const current = (await profilesStorage.getValue()) || [];
  const updated = [...current, newProfile];
  await profilesStorage.setValue(updated);

  // Auto-activate if it's the first profile
  if (updated.length === 1) {
    await activeProfileIdStorage.setValue(newProfile.id);
  }

  return newProfile.id;
};

export const updateProfile = async (id: string, updates: Partial<NasProfile>) => {
  const current = (await profilesStorage.getValue()) || [];
  const updated = current.map((p: NasProfile) => (p.id === id ? { ...p, ...updates } : p));
  await profilesStorage.setValue(updated);
};

export const removeProfile = async (id: string) => {
  const current = (await profilesStorage.getValue()) || [];
  const updated = current.filter((p: NasProfile) => p.id !== id);
  await profilesStorage.setValue(updated);

  if (activeProfileId.value === id) {
    await activeProfileIdStorage.setValue(updated.length > 0 ? (updated[0]?.id ?? null) : null);
  }
};

export const updateSettings = async (updates: Partial<AppSettings>) => {
  const current = await settingsStorage.getValue();
  if (current) {
    const updated = { ...current, ...updates };
    await settingsStorage.setValue(updated);
  }
};

export const setActiveProfile = async (id: string) => {
  await activeProfileIdStorage.setValue(id);
};
