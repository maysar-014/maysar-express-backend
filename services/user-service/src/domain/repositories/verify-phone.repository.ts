/**
 * Verify Phone Repository Port
 * Infrastructure Isolation Rule: Domain Interface defines contract
 * Infrastructure Adapter implements this contract
 */

export interface IVerifyPhoneRepository {
  updatePhoneVerification(userId: string, phoneNumber: string, verified: boolean): Promise<void>;
}
