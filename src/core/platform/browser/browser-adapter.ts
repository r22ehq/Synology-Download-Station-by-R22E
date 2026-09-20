/**
 * Browser API adapter — abstracts browser-specific APIs behind a unified interface.
 * Uses WXT's `browser` global which polyfills across Chrome, Firefox, Edge, Opera, Safari.
 */

export interface BrowserInfo {
  name: 'chrome' | 'firefox' | 'edge' | 'opera' | 'arc' | 'safari' | 'unknown';
  isChromium: boolean;
}

/**
 * Requests host permission for a specific NAS origin.
 * Must be called from a user-gesture context (button click).
 */
export const requestOriginPermission = async (origin: string): Promise<boolean> => {
  try {
    return await browser.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
};

/** Checks whether the extension has permission for a given origin. */
export const hasOriginPermission = async (origin: string): Promise<boolean> => {
  try {
    return await browser.permissions.contains({ origins: [origin] });
  } catch {
    return false;
  }
};

/** Removes a previously granted origin permission. */
export const removeOriginPermission = async (origin: string): Promise<boolean> => {
  try {
    return await browser.permissions.remove({ origins: [origin] });
  } catch {
    return false;
  }
};

/** Requests an optional API permission (e.g. 'notifications', 'downloads'). */
export const requestOptionalPermission = async (permission: string): Promise<boolean> => {
  try {
    return await browser.permissions.request({
      permissions: [permission],
    } as Parameters<typeof browser.permissions.request>[0]);
  } catch {
    return false;
  }
};

/** Checks whether an optional permission has been granted. */
export const hasOptionalPermission = async (permission: string): Promise<boolean> => {
  try {
    return await browser.permissions.contains({
      permissions: [permission],
    } as Parameters<typeof browser.permissions.contains>[0]);
  } catch {
    return false;
  }
};

/**
 * Detects the current browser via user-agent heuristics.
 * Feature detection is preferred over sniffing where possible,
 * but browser identity is sometimes needed for UI or API decisions.
 */
export const getBrowserInfo = (): BrowserInfo => {
  const ua = navigator.userAgent.toLowerCase();
  let name: BrowserInfo['name'] = 'unknown';

  if (ua.includes('edg')) name = 'edge';
  else if (ua.includes('opr') || ua.includes('opera')) name = 'opera';
  else if (ua.includes('firefox')) name = 'firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) name = 'safari';
  else if (ua.includes('chrome')) name = 'chrome';

  return {
    name,
    isChromium: ['chrome', 'edge', 'opera', 'arc'].includes(name),
  };
};

/** Opens the extension's options/settings page. */
export const openOptionsPage = (): void => {
  browser.runtime.openOptionsPage().catch(() => {
    // Silently fail — some contexts may not support this
  });
};

/**
 * Opens the side panel (Chrome sidePanel API) or sidebar (Firefox sidebar_action).
 * Uses runtime feature detection to handle API availability.
 */
export const openSidePanel = async (_tabId?: number): Promise<void> => {
  // Firefox sidebar_action
  const b = browser as Record<string, unknown>;
  if (b.sidebarAction && typeof b.sidebarAction === 'object') {
    const sidebarAction = b.sidebarAction as { open: () => Promise<void> };
    await sidebarAction.open();
    return;
  }

  // Chrome sidePanel API — accessed via globalThis to avoid type errors
  const g = globalThis as Record<string, unknown>;
  const chromeObj = g.chrome as Record<string, unknown> | undefined;
  if (chromeObj?.sidePanel && typeof chromeObj.sidePanel === 'object') {
    const sidePanel = chromeObj.sidePanel as {
      open: (options: { windowId: number }) => Promise<void>;
    };
    const currentWindow = await browser.windows.getCurrent();
    if (currentWindow.id !== undefined) {
      await sidePanel.open({ windowId: currentWindow.id });
    }
  }
};

/** Resolves a path relative to the extension's root directory. */
export const getExtensionUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // WXT types the path parameter strictly; runtime accepts any valid path
  return browser.runtime.getURL(normalizedPath as `/popup.html`);
};
