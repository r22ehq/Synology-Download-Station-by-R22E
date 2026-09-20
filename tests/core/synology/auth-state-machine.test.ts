import { describe, it, expect, vi } from 'vitest';
import { AuthStateMachine } from '../../../src/core/synology/auth/auth-state-machine';

describe('AuthStateMachine', () => {
  it('should transition through the happy path: unknown -> connecting -> authenticated -> validating -> ready', () => {
    const sm = new AuthStateMachine();
    const listener = vi.fn();
    sm.subscribe(listener);

    expect(sm.state).toBe('unknown');

    sm.startConnecting();
    expect(sm.state).toBe('connecting');
    expect(listener).toHaveBeenCalledWith('connecting');

    sm.authenticateSuccess();
    expect(sm.state).toBe('authenticated');

    sm.startValidating();
    expect(sm.state).toBe('validating');

    sm.ready();
    expect(sm.state).toBe('ready');
  });

  it('should handle failure and recovery transitions', () => {
    const sm = new AuthStateMachine();
    
    // Connect & authenticate & ready
    sm.startConnecting();
    sm.authenticateSuccess();
    sm.startValidating();
    sm.ready();

    // Expire session
    sm.expireSession();
    expect(sm.state).toBe('session-expired');

    // Reconnecting
    sm.startConnecting();
    expect(sm.state).toBe('connecting');
  });

  it('should prevent invalid transitions', () => {
    const sm = new AuthStateMachine();
    
    expect(() => sm.authenticateSuccess()).not.toThrow(); // Does nothing
    expect(sm.state).toBe('unknown');

    sm.startConnecting();
    
    expect(() => sm.startConnecting()).toThrow('Cannot connect from state connecting');
  });

  it('should handle specific failures', () => {
    const sm = new AuthStateMachine();
    sm.startConnecting();
    sm.fail('nas-unreachable');
    expect(sm.state).toBe('nas-unreachable');
    
    // Recover
    sm.startConnecting();
    expect(sm.state).toBe('connecting');
  });
});
