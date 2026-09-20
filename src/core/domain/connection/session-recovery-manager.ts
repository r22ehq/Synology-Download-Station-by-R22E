import { ConnectionManager } from './connection-manager';
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

        // Re-authenticate
        await this.connectionManager.connect(profileId);

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
