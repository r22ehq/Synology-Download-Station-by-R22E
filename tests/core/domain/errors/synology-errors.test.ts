import { describe, it, expect } from 'vitest';
import { mapSynologyError } from '../../../../src/core/domain/errors/synology-errors';
import { SynoError } from '../../../../src/core/synology/types';
import * as Errors from '../../../../src/core/domain/errors/synology-errors';

describe('Synology Error Mapper', () => {
  it.each([
    [105, Errors.SessionPermissionDeniedError],
    [106, Errors.SessionExpiredError],
    [107, Errors.SessionReplacedError],
    [119, Errors.InvalidSessionError],
    [999, Errors.UnknownSynologyError], // 999 is not explicitly mapped, should fallback
    [400, Errors.InvalidCredentialsError],
    [401, Errors.AccountDisabledError],
    [402, Errors.PermissionDeniedError],
    [403, Errors.TwoFactorRequiredError],
    [404, Errors.InvalidOtpError],
    [406, Errors.TwoFactorForcedError],
    [407, Errors.IpBlockedError],
    [408, Errors.PasswordExpiredError],
    [409, Errors.PasswordExpiredError],
    [410, Errors.PasswordChangeRequiredError],
  ])('maps DSM code %i to %p', (code, ExpectedClass) => {
    const rawError = new SynoError(code, `Error ${code}`);
    const mapped = mapSynologyError(rawError);
    expect(mapped).toBeInstanceOf(ExpectedClass);
  });
});
