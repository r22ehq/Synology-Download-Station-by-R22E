import type { ConnectionState } from '../../../ui/state/app-state';

export class AuthStateMachine {
  private _state: ConnectionState = 'unknown';
  private listeners: Set<(state: ConnectionState) => void> = new Set();

  get state(): ConnectionState {
    return this._state;
  }

  public subscribe(listener: (state: ConnectionState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private transitionTo(newState: ConnectionState) {
    if (this._state === newState) return;
    this._state = newState;
    this.listeners.forEach(l => l(newState));
  }

  // Valid transitions
  public startConnecting() {
    if (this._state === 'unknown' || this._state === 'session-expired' || this._state === 'authentication-failed' || this._state === 'nas-unreachable' || this._state === 'waiting-for-2fa') {
      this.transitionTo('connecting');
    } else {
      throw new Error(`Cannot connect from state ${this._state}`);
    }
  }

  public waitingFor2FA() {
    if (this._state === 'connecting') {
      this.transitionTo('waiting-for-2fa');
    }
  }

  public authenticateSuccess() {
    if (this._state === 'connecting') {
      this.transitionTo('authenticated');
    }
  }

  public startValidating() {
    if (this._state === 'authenticated') {
      this.transitionTo('validating');
    }
  }

  public ready() {
    if (this._state === 'validating') {
      this.transitionTo('ready');
    }
  }

  public fail(reason: 'permission-denied' | 'nas-unreachable' | 'authentication-failed' | 'download-station-unavailable') {
    this.transitionTo(reason);
  }

  public expireSession() {
    if (this._state === 'ready' || this._state === 'authenticated') {
      this.transitionTo('session-expired');
    }
  }
}
