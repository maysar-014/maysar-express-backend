/**
 * Phone Verification Domain Errors
 * Typed error classes for the Firebase Phone OTP verification flow
 */

export class InvalidPhoneNumberError extends Error {
  constructor(phone: string) {
    super(`Phone number "${phone}" does not conform to E.164 format (e.g. +255712345678)`);
    this.name = 'InvalidPhoneNumberError';
  }
}

export class InvalidFirebaseTokenError extends Error {
  constructor(reason: string) {
    super(`Firebase ID token is invalid or expired: ${reason}`);
    this.name = 'InvalidFirebaseTokenError';
  }
}

export class TokenMissingPhoneClaimError extends Error {
  constructor() {
    super('Firebase ID token does not contain a phone_number claim');
    this.name = 'TokenMissingPhoneClaimError';
  }
}

export class PhoneNumberMismatchError extends Error {
  constructor() {
    super('The phone number in the Firebase token does not match the registered phone number');
    this.name = 'PhoneNumberMismatchError';
  }
}

export class MissingFirebaseTokenError extends Error {
  constructor() {
    super('firebaseIdToken is required in the request body');
    this.name = 'MissingFirebaseTokenError';
  }
}
