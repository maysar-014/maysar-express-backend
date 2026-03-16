export interface IEnablerPolicyRepository {
  createDefaultPolicy(enablerId: string, createdBy: string): Promise<void>;
}
