import type { SetupTwoFactorDTO } from './setup-two-factor.dto';

describe('SetupTwoFactorDTO', () => {
  it('supports setup request/response contracts', () => {
    const request: SetupTwoFactorDTO.Request = {
      method: 'totp',
      deviceId: 'device-1'
    };
    const response: SetupTwoFactorDTO.Response = {
      success: true,
      message: '2FA configured',
      secret: 'secret',
      backupCodes: ['a', 'b']
    };

    expect(request.method).toBe('totp');
    expect(response.backupCodes).toHaveLength(2);
  });
});
