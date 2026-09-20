import { sendMessage } from '@/core/platform/messaging/message-contracts';

export interface TestResult {
  success: boolean;
  diagnostic?: string;
}

/**
 * Tests a NAS connection by messaging the background service worker.
 * This ensures the test originates from the background context which has the necessary host permissions.
 */
export const testConnection = async (config: {
  url: string;
  username?: string;
  password?: string;
}): Promise<TestResult> => {
  if (!config.url) {
    return { success: false, diagnostic: 'Incomplete connection details' };
  }

  try {
    const result = await sendMessage('connection:test', {
      config: {
        url: config.url,
        username: config.username || '',
        password: config.password || '',
      },
    });

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      diagnostic: error instanceof Error ? error.message : 'Unknown messaging error',
    };
  }
};
