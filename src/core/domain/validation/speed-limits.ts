import type { SpeedLimits } from '../../synology/download-station/types';

export const speedLimitFields = ['bt_max_download', 'bt_max_upload', 'http_max_download', 'nzb_max_download'] as const;

export function validateSpeedLimits(limits: SpeedLimits): void {
  if (Object.keys(limits).some(key => !speedLimitFields.includes(key as typeof speedLimitFields[number]))) {
    throw new Error('Only download and upload speed limits can be changed here.');
  }
  for (const key of speedLimitFields) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 0) {
      throw new Error('Enter a whole number of KB/s, or 0 for unlimited.');
    }
  }
}
