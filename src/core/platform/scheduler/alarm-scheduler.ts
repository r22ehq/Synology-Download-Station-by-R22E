/**
 * Adaptive polling scheduler.
 * Uses browser.alarms for background contexts and setInterval for foreground.
 */

const ALARM_NAME = 'r22e-poll';

/** Polling intervals by context in milliseconds */
const INTERVALS = {
  /** Popup open with active downloads */
  popupActive: 3000,
  /** Popup open with no active downloads */
  popupIdle: 10000,
  /** Side panel persistent view */
  sidepanel: 5000,
  /** Background with active downloads */
  backgroundActive: 30000,
  /** Background with no activity — no polling */
  backgroundIdle: 0,
} as const;

type PollingContext = 'popup' | 'sidepanel' | 'background';

export class AlarmScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private pollCallback: (() => Promise<void>) | null = null;
  private currentContext: PollingContext = 'background';
  private hasActiveDownloads = false;

  /** Registers the function to call on each poll tick. */
  onPoll(callback: () => Promise<void>): void {
    this.pollCallback = callback;
  }

  /** Starts polling at the given interval. Chooses alarms vs setInterval by context. */
  startPolling(intervalMs: number): void {
    this.stopPolling();

    if (intervalMs <= 0) return;

    if (this.currentContext === 'background') {
      // Background uses browser.alarms for MV3 service worker compatibility
      browser.alarms.create(ALARM_NAME, {
        periodInMinutes: Math.max(intervalMs / 60000, 0.5),
      });
    } else {
      // Foreground contexts use setInterval for sub-minute precision
      this.intervalId = setInterval(() => {
        this.pollCallback?.().catch(() => {
          // Errors handled by the callback itself
        });
      }, intervalMs);
    }
  }

  /** Stops all active polling. */
  stopPolling(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    browser.alarms.clear(ALARM_NAME).catch(() => {
      // May fail if no alarm exists
    });
  }

  /** Sets the polling interval based on the current UI context and download activity. */
  setAdaptiveInterval(context: PollingContext, hasActiveDownloads = false): void {
    this.currentContext = context;
    this.hasActiveDownloads = hasActiveDownloads;

    let interval: number;
    switch (context) {
      case 'popup':
        interval = hasActiveDownloads ? INTERVALS.popupActive : INTERVALS.popupIdle;
        break;
      case 'sidepanel':
        interval = INTERVALS.sidepanel;
        break;
      case 'background':
        interval = hasActiveDownloads ? INTERVALS.backgroundActive : INTERVALS.backgroundIdle;
        break;
    }

    this.startPolling(interval);
  }

  /** Updates download activity state and adjusts polling if needed. */
  setDownloadActivity(hasActiveDownloads: boolean): void {
    if (this.hasActiveDownloads !== hasActiveDownloads) {
      this.setAdaptiveInterval(this.currentContext, hasActiveDownloads);
    }
  }

  /**
   * Registers the alarm listener. Must be called at top level in the background script.
   * This ensures the listener is active when the service worker wakes from an alarm.
   */
  registerAlarmListener(): void {
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === ALARM_NAME && this.pollCallback) {
        this.pollCallback().catch(() => {
          // Errors handled by the callback itself
        });
      }
    });
  }

  /** Cleans up all resources. */
  destroy(): void {
    this.stopPolling();
    this.pollCallback = null;
  }
}
