/**
 * Delete Account DTOs
 * DTO Firewall Rule: No Domain Entity crosses service boundary
 */

export namespace DeleteAccountDTO {
  export interface Request {
    deletedBy: string;
    reason: string;
    verificationToken?: string;
  }

  export interface Response {
    success: boolean;
    message: string;
    deletionScheduledAt?: Date;
  }
}
