/**
 * Change Password Repository Port
 * Infrastructure Isolation Rule: Domain Interface defines contract
 * Infrastructure Adapter implements this contract
 */

export interface IChangePasswordRepository {
  updatePassword(userId: string, newPassword: string): Promise<void>;
}
