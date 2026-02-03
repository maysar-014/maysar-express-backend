/**
 * Suspend Account Repository Port
 * Infrastructure Isolation Rule: Domain Interface defines contract
 * Infrastructure Adapter implements this contract
 */

export interface ISuspendAccountRepository {
  updateStatus(userId: string, status: string): Promise<void>;
}
