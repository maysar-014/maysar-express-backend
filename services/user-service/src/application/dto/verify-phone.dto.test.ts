import type { VerifyPhoneDTO } from './verify-phone.dto';

describe('VerifyPhoneDTO', () => {
  it('supports verify request/response contracts', () => {
    const request: VerifyPhoneDTO.Request = {
      phoneNumber: '+255712345678',
      otp: '123456',
      verificationMethod: 'otp'
    };
    const response: VerifyPhoneDTO.Response = {
      success: true,
      message: 'Phone verified',
      phoneVerified: true
    };

    expect(request.verificationMethod).toBe('otp');
    expect(response.phoneVerified).toBe(true);
  });
});
