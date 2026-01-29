/**
 * Suspend Account DTOs
 * DTO Firewall Rule: No Domain Entity crosses service boundary
 */

export namespace SuspendAccountDTO {
  export interface Request {
    suspendedBy: string;
    reason: string;
    duration?: number;
  }

  export interface Response {
    success: boolean;
    message: string;
    suspensionEndDate?: Date;
  }
}
