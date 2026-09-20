import { ApiRegistry } from '@/core/synology/api-discovery/api-registry';
import { AuthClient } from '@/core/synology/auth/auth-client';
import { SessionManager } from '@/core/synology/auth/session-manager';
import { SynoHttpClient } from '@/core/synology/transport/http-client';
import { AuthStateMachine } from '@/core/synology/auth/auth-state-machine';
import { profilesStorage, getAuthDeviceStorageItem } from '@/core/platform/storage/storage-items';
import {
  mapSynologyError,
  TwoFactorRequiredError,
  TwoFactorForcedError,
  InvalidOtpError,
  PermissionDeniedError,
  AccountDisabledError,
  SessionPermissionDeniedError,
  InvalidCredentialsError,
  IpBlockedError,
  SourceIpMismatchError,
  PasswordExpiredError,
  PasswordChangeRequiredError,
  NetworkUnavailableError,
  UnknownSynologyError
} from '@/core/domain/errors/synology-errors';

export class ConnectionManager {
  private httpClient = new SynoHttpClient();
  private authClient = new AuthClient(this.httpClient);
  public sessionManager = new SessionManager();
  public stateMachine = new AuthStateMachine();
  public registry = new ApiRegistry('');

  /**
   * Main connection loop: attempts to connect to the active profile.
   * Dispatches state to the FSM.
   */
  public async connect(profileId: string, otpCode?: string, password?: string): Promise<void> {
    this.stateMachine.startConnecting();
    
    try {
      const profiles = (await profilesStorage.getValue()) || [];
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const baseUrl = `${profile.protocol}://${profile.host}:${profile.port}`;
      this.registry = new ApiRegistry(baseUrl);

      // 1. Discovery
      const infoRes = await this.httpClient.get<Record<string, { maxVersion: number; minVersion: number; path: string }>>(
        baseUrl,
        'query.cgi',
        { params: { api: 'SYNO.API.Info', version: 1, method: 'query', query: 'all' }, timeout: 10000 }
      );
      
      Object.entries(infoRes).forEach(([name, info]) => {
        this.registry.register(name, info);
      });

      if (!this.registry.isAvailable('SYNO.API.Auth')) {
        this.stateMachine.fail('download-station-unavailable');
        return;
      }

      const authDeviceItem = getAuthDeviceStorageItem(profileId);
      const deviceId = await authDeviceItem.getValue();
      const deviceName = 'R22E Station';
      const loginOptions: import('@/core/synology/auth/types').LoginOptions = {};

      if (deviceId && !otpCode) {
        // If we have a deviceId and no OTP is provided, try auto-login
        loginOptions.deviceId = deviceId;
        loginOptions.deviceName = deviceName;
      } else if (otpCode) {
        // First login with OTP, request device token
        loginOptions.otpCode = otpCode;
        loginOptions.enableDeviceToken = 'yes';
        loginOptions.deviceName = deviceName;
      }
      
      try {
        const result = await this.authClient.login(
          baseUrl,
          this.registry,
          profile.username,
          password || 'placeholder',
          loginOptions
        );

        // Save device token if returned (did or device_id)
        const newDeviceId = result.did || result.device_id || deviceId;
        if (newDeviceId && newDeviceId !== deviceId) {
          await authDeviceItem.setValue(newDeviceId);
        }

        // Store Session
        this.sessionManager.setSession(profileId, {
          sid: result.sid,
          synoToken: result.synotoken,
        });

        this.stateMachine.authenticateSuccess();
        this.stateMachine.startValidating();
        if (this.registry.isAvailable('SYNO.DownloadStation.Info') || this.registry.isAvailable('SYNO.DownloadStation2.Task')) {
           this.stateMachine.ready();
        } else {
           this.stateMachine.fail('download-station-unavailable');
        }

      } catch (rawErr: unknown) {
        const err = mapSynologyError(rawErr);

        if (err instanceof TwoFactorRequiredError || err instanceof TwoFactorForcedError) {
          if (deviceId && !otpCode) {
             await authDeviceItem.removeValue();
          }
          this.stateMachine.waitingFor2FA();
          return;
        }

        if (err instanceof InvalidOtpError) {
           throw err;
        }

        if (err instanceof PermissionDeniedError || err instanceof AccountDisabledError || err instanceof SessionPermissionDeniedError) {
           this.stateMachine.fail('permission-denied');
           throw err;
        }

        if (err instanceof InvalidCredentialsError || err instanceof IpBlockedError || err instanceof SourceIpMismatchError || err instanceof PasswordExpiredError || err instanceof PasswordChangeRequiredError) {
           this.stateMachine.fail('authentication-failed');
           throw err;
        }

        if (err instanceof NetworkUnavailableError) {
           this.stateMachine.fail('nas-unreachable');
           throw err;
        }

        this.stateMachine.fail('authentication-failed');
        throw err;
      }
      
    } catch (err) {
      console.error('Connection failed', err);
      if (err instanceof UnknownSynologyError || err instanceof InvalidCredentialsError) {
        this.stateMachine.fail('authentication-failed');
      } else {
        this.stateMachine.fail('nas-unreachable');
      }
      throw err;
    }
  }

  public async logout(profileId: string): Promise<void> {
    const profiles = (await profilesStorage.getValue()) || [];
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    const baseUrl = `${profile.protocol}://${profile.host}:${profile.port}`;
    const sid = this.sessionManager.getSid(profileId);
    if (sid) {
       await this.authClient.logout(baseUrl, this.registry, sid);
       this.sessionManager.clearSession(profileId);
    }
    
    // Session manager cleared above
    this.stateMachine.expireSession();
  }
}

// Singleton for background script
export const connectionManager = new ConnectionManager();
