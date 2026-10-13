import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlarmScheduler } from '../../../../src/core/platform/scheduler/alarm-scheduler';

interface BrowserAlarmTestApi {
  alarms: {
    create: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    onAlarm: {
      addListener: ReturnType<typeof vi.fn>;
    };
  };
}

describe('AlarmScheduler', () => {
  let scheduler: AlarmScheduler;
  let browserMock: BrowserAlarmTestApi;

  beforeEach(() => {
    vi.useFakeTimers();
    browserMock = {
      alarms: {
        create: vi.fn(),
        clear: vi.fn().mockResolvedValue(undefined),
        onAlarm: {
          addListener: vi.fn(),
        },
      },
    };
    vi.stubGlobal('browser', browserMock);
    scheduler = new AlarmScheduler();
  });

  afterEach(() => {
    scheduler.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('adjusts polling interval for popup active state (3000ms)', () => {
    scheduler.setAdaptiveInterval('popup', true);
    expect(browserMock.alarms.create).not.toHaveBeenCalled();
    // It should use setInterval for popup
    expect(vi.getTimerCount()).toBe(1);
  });

  it('adjusts polling interval for background active state', () => {
    scheduler.setAdaptiveInterval('background', true);
    expect(browserMock.alarms.create).toHaveBeenCalledWith('r22e-poll', {
      periodInMinutes: Math.max(30000 / 60000, 0.5),
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears intervals when switching to background idle', () => {
    scheduler.setAdaptiveInterval('popup', true);
    expect(vi.getTimerCount()).toBe(1);
    
    scheduler.setAdaptiveInterval('background', false);
    expect(vi.getTimerCount()).toBe(0); // Interval should be cleared
    // backgroundIdle interval is 0, so no alarm is created
    expect(browserMock.alarms.create).not.toHaveBeenCalled();
  });

  it('coalesces UI connections by only running one polling timer', () => {
    // Popup opens
    scheduler.setAdaptiveInterval('popup', true);
    expect(vi.getTimerCount()).toBe(1);

    // Side panel opens
    scheduler.setAdaptiveInterval('sidepanel', true);
    expect(vi.getTimerCount()).toBe(1); // STILL ONE!

    // Popup closes, side panel remains
    scheduler.setAdaptiveInterval('sidepanel', true);
    expect(vi.getTimerCount()).toBe(1); // STILL ONE!
  });
});
