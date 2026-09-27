import { ConnectionManager } from './connection-manager';
import { getAuthDeviceStorageItem, getSavedPasswordStorageItem } from '@/core/platform/storage/storage-items';
import {
  mapSynologyError,
  SessionExpiredError,
  SessionReplacedError,
  InvalidSessionError
} from '../errors/synology-errors';

export class SessionRecoveryManager {
  constructor(private connectionManager: ConnectionManager) {}

  public async executeWithRecovery<T>(
    profileId: string,
    operation: () => Promise<T>,
    options: { isIdempotent: boolean }
  ): Promise<T> {
    try {
      return await operation();
    } catch (rawErr: unknown) {
      const err = mapSynologyError(rawErr);

      if (
        err instanceof SessionExpiredError ||
        err instanceof SessionReplacedError ||
        err instanceof InvalidSessionError
      ) {
        // Clear session first
        this.connectionManager.logout(profileId).catch(() => {});

        // Re-authenticate only when the user explicitly saved a password.
        const password = await getSavedPasswordStorageItem(profileId).getValue();
        if (!password) throw err;
        const rememberDevice = Boolean(await getAuthDeviceStorageItem(profileId).getValue());
        await this.connectionManager.connect(profileId, undefined, password, rememberDevice);

        // Retry only if idempotent
        if (options.isIdempotent) {
          return await operation();
        } else {
          throw new Error('Session invalidated during non-idempotent operation', { cause: rawErr });
        }
      }

      throw err;
    }
  }
}
