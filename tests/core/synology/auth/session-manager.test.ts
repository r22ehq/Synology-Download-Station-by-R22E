import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '@/core/synology/auth/session-manager';
import type { AuthSession } from '@/core/synology/auth/types';
import { SynoCommonErrorCodes } from '@/core/synology/types';

describe('SessionManager', () => {
  const manager = new SessionManager();
  const profileId = 'test-nas-1';

  beforeEach(() => {
    manager.clearAll();
  });

  it('stores and retrieves a session', () => {
    const session: AuthSession = { sid: 'abc123', synoToken: 'token456' };
    manager.setSession(profileId, session);
    expect(manager.getSession(profileId)).toEqual(session);
  });

  it('returns null for unknown profile', () => {
    expect(manager.getSession('nonexistent')).toBeNull();
  });

  it('returns SID for a profile', () => {
    manager.setSession(profileId, { sid: 'sid-value' });
    expect(manager.getSid(profileId)).toBe('sid-value');
  });

  it('returns null SID for unknown profile', () => {
    expect(manager.getSid('nonexistent')).toBeNull();
  });

  it('returns synoToken when available', () => {
    manager.setSession(profileId, { sid: 'x', synoToken: 'csrf-tok' });
    expect(manager.getSynoToken(profileId)).toBe('csrf-tok');
  });

  it('clears a session', () => {
    manager.setSession(profileId, { sid: 'abc' });
    manager.clearSession(profileId);
    expect(manager.getSession(profileId)).toBeNull();
  });

  it('validates session presence', () => {
    expect(manager.isSessionValid(profileId)).toBe(false);
    manager.setSession(profileId, { sid: 'valid' });
    expect(manager.isSessionValid(profileId)).toBe(true);
  });

  it('rejects empty SID as invalid', () => {
    manager.setSession(profileId, { sid: '' });
    expect(manager.isSessionValid(profileId)).toBe(false);
  });

  it('handles session error 106 (timeout)', () => {
    manager.setSession(profileId, { sid: 'abc' });
    const cleared = manager.handleSessionError(profileId, 106);
    expect(cleared).toBe(true);
    expect(manager.isSessionValid(profileId)).toBe(false);
  });

  it('handles session error 107 (interrupted)', () => {
    manager.setSession(profileId, { sid: 'abc' });
    const cleared = manager.handleSessionError(profileId, 107);
    expect(cleared).toBe(true);
  });

  it('should invalidate session on INVALID_SESSION error', () => {
    manager.setSession(profileId, { sid: 'abc' });
    const cleared = manager.handleSessionError(profileId, SynoCommonErrorCodes.INVALID_SESSION);
    expect(cleared).toBe(true);
    expect(manager.isSessionValid(profileId)).toBe(false);
  });

  it('does not clear session for non-session errors', () => {
    manager.setSession(profileId, { sid: 'abc' });
    const cleared = manager.handleSessionError(profileId, 400);
    expect(cleared).toBe(false);
    expect(manager.isSessionValid(profileId)).toBe(true);
  });

  it('serializes and deserializes sessions', () => {
    manager.setSession('nas-1', { sid: 'sid1' });
    manager.setSession('nas-2', { sid: 'sid2', synoToken: 'tok2' });

    const record = manager.toRecord();
    expect(Object.keys(record)).toHaveLength(2);

    const newManager = new SessionManager();
    newManager.loadFromRecord(record);
    expect(newManager.getSid('nas-1')).toBe('sid1');
    expect(newManager.getSynoToken('nas-2')).toBe('tok2');
  });

  it('clearAll removes all sessions', () => {
    manager.setSession('a', { sid: '1' });
    manager.setSession('b', { sid: '2' });
    manager.clearAll();
    expect(manager.getSid('a')).toBeNull();
    expect(manager.getSid('b')).toBeNull();
  });

  it('does not erase a login completed during a pending storage read', async () => {
    let finishRead!: (record: Record<string, AuthSession>) => void;
    const pending = manager.restoreFromStorage(() => new Promise(resolve => { finishRead = resolve; }));
    manager.setSession(profileId, { sid: 'new-login-sid' });
    finishRead({});
    expect(await pending).toBe(false);
    expect(manager.getSid(profileId)).toBe('new-login-sid');
  });

  it.each(['clearSession', 'clearAll'] as const)('does not resurrect a session after %s during a storage read', async operation => {
    manager.setSession(profileId, { sid: 'old-sid' });
    let finishRead!: (record: Record<string, AuthSession>) => void;
    const pending = manager.restoreFromStorage(() => new Promise(resolve => { finishRead = resolve; }));
    manager[operation](profileId);
    finishRead({ [profileId]: { sid: 'old-sid' } });
    expect(await pending).toBe(false);
    expect(manager.getSid(profileId)).toBeNull();
  });

  it('preserves live sessions while restoring other profiles from storage', async () => {
    manager.setSession(profileId, { sid: 'live-sid' });
    expect(await manager.restoreFromStorage(async () => ({
      [profileId]: { sid: 'stale-sid' },
      'other-nas': { sid: 'stored-sid' },
    }))).toBe(true);
    expect(manager.getSid(profileId)).toBe('live-sid');
    expect(manager.getSid('other-nas')).toBe('stored-sid');
  });

  it('does not let overlapping hydration overwrite the first completed restore', async () => {
    let finishRead!: (record: Record<string, AuthSession>) => void;
    const pending = manager.restoreFromStorage(() => new Promise(resolve => { finishRead = resolve; }));
    await manager.restoreFromStorage(async () => ({ [profileId]: { sid: 'restored-sid' } }));
    finishRead({});
    expect(await pending).toBe(false);
    expect(manager.getSid(profileId)).toBe('restored-sid');
  });
});
