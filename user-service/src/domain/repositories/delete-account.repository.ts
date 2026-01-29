/**
 * Delete Account Repository Port
 * Infrastructure Isolation Rule: Domain Interface defines contract
 * Infrastructure Adapter implements this contract
 */

export interface IDeleteAccountRepository {
  markAsDeleted(userId: string): Promise<void>;
}
