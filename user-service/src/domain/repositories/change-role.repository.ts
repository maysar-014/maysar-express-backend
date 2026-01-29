/**
 * Change Role Repository Port
 * Infrastructure Isolation Rule: Domain Interface defines contract
 * Infrastructure Adapter implements this contract
 */

export interface IChangeRoleRepository {
  updateRole(userId: string, role: string): Promise<void>;
}
