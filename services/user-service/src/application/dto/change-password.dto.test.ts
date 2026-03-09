import type { ChangePasswordDTO } from './change-password.dto';

describe('ChangePasswordDTO', () => {
  it('supports request/response contracts', () => {
    const request: ChangePasswordDTO.Request = {
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
      changedBy: 'user-1'
    };
    const response: ChangePasswordDTO.Response = {
      success: true,
      message: 'Password changed'
    };

    expect(request.newPassword).toBe('new-pass');
    expect(response.success).toBe(true);
  });
});
