import type { SuspendAccountDTO } from './suspend-account.dto';

describe('SuspendAccountDTO', () => {
  it('supports suspend request/response contracts', () => {
    const request: SuspendAccountDTO.Request = {
      suspendedBy: 'admin-2',
      reason: 'policy breach',
      duration: 7
    };
    const response: SuspendAccountDTO.Response = {
      success: true,
      message: 'Account suspended',
      suspensionEndDate: new Date('2026-03-15T00:00:00.000Z')
    };

    expect(request.duration).toBe(7);
    expect(response.suspensionEndDate).toBeInstanceOf(Date);
  });
});
