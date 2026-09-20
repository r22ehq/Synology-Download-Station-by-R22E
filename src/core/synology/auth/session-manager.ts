import type { AuthSession } from './types';
import { SynoCommonErrorCodes } from '../types';

/**
 * Manages authentication sessions per NAS profile.
 * Uses a simple in-memory store — the persistent layer is handled
 * by the storage-items module. This class manages the runtime lifecycle.
 */
export class SessionManager {
  private sessions: Map<string, AuthSession> = new Map();

  /** Stores a session for a given profile. */
  setSession(profileId: string, session: AuthSession): void {
    this.sessions.set(profileId, session);
  }

  /** Retrieves the current session for a profile, if any. */
  getSession(profileId: string): AuthSession | null {
    return this.sessions.get(profileId) ?? null;
  }

  /** Returns the SID for a profile, or null if not authenticated. */
  getSid(profileId: string): string | null {
    return this.getSession(profileId)?.sid ?? null;
  }

  /** Returns the CSRF token for a profile, or undefined. */
  getSynoToken(profileId: string): string | undefined {
    return this.getSession(profileId)?.synoToken;
  }

  /** Removes a session. */
  clearSession(profileId: string): void {
    this.sessions.delete(profileId);
  }

  /** Checks if we have a stored SID for a profile. */
  isSessionValid(profileId: string): boolean {
    const session = this.getSession(profileId);
    return session !== null && session.sid.length > 0;
  }

  /**
   * Checks if an error code indicates a session problem and clears the session if so.
   * Returns true if the session was invalidated (caller should trigger re-auth).
   */
  handleSessionError(profileId: string, errorCode: number): boolean {
    const sessionErrorCodes: readonly number[] = [
      SynoCommonErrorCodes.PERMISSION_DENIED,
      SynoCommonErrorCodes.SESSION_TIMEOUT,
      SynoCommonErrorCodes.SESSION_INTERRUPTED,
      SynoCommonErrorCodes.INVALID_SESSION,
      SynoCommonErrorCodes.REQUEST_SOURCE_IP_MISMATCH,
    ];

    if (sessionErrorCodes.includes(errorCode)) {
      this.clearSession(profileId);
      return true;
    }

    return false;
  }

  /** Loads sessions from a serialized record (e.g. from extension storage). */
  loadFromRecord(record: Record<string, AuthSession>): void {
    this.sessions.clear();
    for (const [profileId, session] of Object.entries(record)) {
      this.sessions.set(profileId, session);
    }
  }

  /** Exports sessions as a serializable record for persistence. */
  toRecord(): Record<string, AuthSession> {
    const record: Record<string, AuthSession> = {};
    for (const [profileId, session] of this.sessions.entries()) {
      record[profileId] = session;
    }
    return record;
  }

  /** Clears all sessions. */
  clearAll(): void {
    this.sessions.clear();
  }
}
