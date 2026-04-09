/**
 * Change Role DTOs
 * DTO Firewall Rule: No Domain Entity crosses service boundary
 */

export namespace ChangeRoleDTO {
  export interface Request {
    newRole: string;
    changedBy: string;
    changedByRoles?: string[];
    promotionReason?: string;
  }

  export interface Response {
    success: boolean;
    message: string;
    oldRole?: string;
    newRole?: string;
  }
}
