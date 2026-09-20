/**
 * Vitest test setup — mocks browser extension APIs for unit testing.
 */
import { vi, beforeEach } from 'vitest';

const storageMock = new Map<string, unknown>();

const browserMock = {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[]) => {
        const result: Record<string, unknown> = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          const val = storageMock.get(key);
          if (val !== undefined) {
            result[key] = val;
          }
        }
        return result;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(items)) {
          storageMock.set(key, value);
        }
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          storageMock.delete(key);
        }
      }),
      clear: vi.fn(async () => {
        storageMock.clear();
      }),
    },
    session: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    openOptionsPage: vi.fn(async () => undefined),
    id: 'test-extension-id',
  },
  i18n: {
    getMessage: vi.fn((key: string) => key),
  },
  permissions: {
    contains: vi.fn(async () => false),
    request: vi.fn(async () => true),
    remove: vi.fn(async () => true),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(async () => true),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  windows: {
    getCurrent: vi.fn(async () => ({ id: 1 })),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

vi.stubGlobal('browser', browserMock);
vi.stubGlobal('chrome', browserMock);

beforeEach(() => {
  storageMock.clear();
  vi.clearAllMocks();
});
