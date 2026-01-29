/**
 * Change Password DTOs
 * DTO Firewall Rule: No Domain Entity crosses service boundary
 */

export namespace ChangePasswordDTO {
  export interface Request {
    currentPassword?: string;
    newPassword: string;
    changedBy: string;
  }

  export interface Response {
    success: boolean;
    message: string;
  }
}
