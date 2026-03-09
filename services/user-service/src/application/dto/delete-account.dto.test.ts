import type { DeleteAccountDTO } from './delete-account.dto';

describe('DeleteAccountDTO', () => {
  it('supports delete request/response contracts', () => {
    const request: DeleteAccountDTO.Request = {
      deletedBy: 'admin-1',
      reason: 'user request',
      verificationToken: 'token-1'
    };
    const response: DeleteAccountDTO.Response = {
      success: true,
      message: 'Deletion scheduled',
      deletionScheduledAt: new Date('2026-03-10T00:00:00.000Z')
    };

    expect(request.reason).toBe('user request');
    expect(response.deletionScheduledAt).toBeInstanceOf(Date);
  });
});
