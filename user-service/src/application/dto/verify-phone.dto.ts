/**
 * Verify Phone DTOs
 * DTO Firewall Rule: No Domain Entity crosses service boundary
 */

export namespace VerifyPhoneDTO {
  export interface Request {
    phoneNumber: string;
    otp: string;
    verificationMethod: 'otp' | 'call';
  }

  export interface Response {
    success: boolean;
    message: string;
    phoneVerified?: boolean;
  }
}
