import type { ChangeRoleDTO } from './change-role.dto';

describe('ChangeRoleDTO', () => {
  it('supports role change request/response contracts', () => {
    const request: ChangeRoleDTO.Request = {
      newRole: 'seller',
      changedBy: 'admin-3',
      promotionReason: 'approved verification'
    };
    const response: ChangeRoleDTO.Response = {
      success: true,
      message: 'Role updated',
      oldRole: 'buyer',
      newRole: 'seller'
    };

    expect(request.newRole).toBe('seller');
    expect(response.oldRole).toBe('buyer');
  });
});
