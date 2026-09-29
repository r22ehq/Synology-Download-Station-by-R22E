import { describe, it, expect } from 'vitest';
import { validateSpeedLimits } from '../../../../src/core/domain/validation/speed-limits';
import type { SpeedLimits } from '../../../../src/core/synology/download-station/types';

const limits: SpeedLimits = { bt_max_download: 0, bt_max_upload: 20, http_max_download: 100, nzb_max_download: 0 };
describe('speed limit validation', () => {
  it('accepts whole-number rates including unlimited', () => expect(() => validateSpeedLimits(limits)).not.toThrow());
  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid rates: %s', value => {
    expect(() => validateSpeedLimits({ ...limits, bt_max_upload: value })).toThrow('whole number');
  });
  it('rejects unrelated server settings', () => {
    expect(() => validateSpeedLimits({ ...limits, emule_enabled: true } as SpeedLimits)).toThrow('Only download');
  });
});
