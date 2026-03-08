import type {
  DisableTwoFactorRequestDTO,
  SetupTwoFactorRequestDTO,
  SetupTwoFactorResponseDTO,
  TwoFactorStatusResponseDTO,
  VerifyBackupCodeRequestDTO,
  VerifyTwoFactorRequestDTO,
  VerifyTwoFactorResponseDTO
} from './two-factor.dto';

describe('two-factor dto types', () => {
  it('supports setup and verification request/response contracts', () => {
    const setupRequest: SetupTwoFactorRequestDTO = {
      method: 'totp',
      deviceName: 'iPhone 16'
    };
    const setupResponse: SetupTwoFactorResponseDTO = {
      secret: 'BASE32SECRET',
      qrCodeDataUrl: 'data:image/png;base64,abc',
      backupCodes: ['CODE1', 'CODE2'],
      uri: 'otpauth://totp/app:user@example.com'
    };
    const verifyRequest: VerifyTwoFactorRequestDTO = { code: '123456' };
    const verifyResponse: VerifyTwoFactorResponseDTO = {
      success: true,
      message: 'verified'
    };

    expect(setupRequest.method).toBe('totp');
    expect(setupResponse.backupCodes).toHaveLength(2);
    expect(verifyRequest.code).toBe('123456');
    expect(verifyResponse.success).toBe(true);
  });

  it('supports disable, backup-code, and status DTO contracts', () => {
    const disableRequest: DisableTwoFactorRequestDTO = { password: 'secret' };
    const backupCodeRequest: VerifyBackupCodeRequestDTO = { code: 'ABCD-1234-EF' };
    const statusResponse: TwoFactorStatusResponseDTO = {
      isEnabled: true,
      isVerified: true,
      method: 'totp',
      deviceName: 'Pixel',
      backupCodesCount: 8,
      lastUsedAt: new Date('2026-01-01T00:00:00.000Z')
    };

    expect(disableRequest.password).toBe('secret');
    expect(backupCodeRequest.code).toContain('ABCD');
    expect(statusResponse.backupCodesCount).toBe(8);
  });
});
