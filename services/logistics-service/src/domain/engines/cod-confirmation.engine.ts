import { GeoPoint } from '../value-objects/geopoint.value-object';

export class CODConfirmationEngine {
    private readonly MAX_PROXIMITY_METERS = 500;
    private readonly OTP_LENGTH = 6;
    private readonly OTP_EXPIRY_HOURS = 24;

    /**
     * Generates a random 6-digit numeric OTP.
     */
    generateOTP(): string {
        const min = Math.pow(10, this.OTP_LENGTH - 1);
        const max = Math.pow(10, this.OTP_LENGTH) - 1;
        return Math.floor(min + Math.random() * (max - min + 1)).toString();
    }

    /**
     * Calculates the expiry timestamp for a new OTP.
     */
    calculateOTPExpiry(): Date {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + this.OTP_EXPIRY_HOURS);
        return expiry;
    }

    /**
     * Validates the provided OTP against the actual one and checks for expiration.
     */
    validateOTP(providedOtp: string, actualOtp: string, expiryAt: Date): boolean {
        // Fail closed when the expected code or its expiry is missing. Without
        // this, `new Date() > undefined` evaluates to false (NaN comparison) and
        // the expiry check silently never fires - so a delivery whose OTP was
        // never persisted would skip expiry enforcement entirely.
        if (!actualOtp || !expiryAt) {
            return false;
        }

        if (new Date() > expiryAt) {
            return false;
        }
        return providedOtp === actualOtp;
    }

    /**
     * Verifies if the courier is within the allowed proximity of the delivery address.
     */
    isWithinProximity(currentPos: GeoPoint, deliveryPos: GeoPoint): boolean {
        const distanceKm = currentPos.distanceTo(deliveryPos);
        return (distanceKm * 1000) <= this.MAX_PROXIMITY_METERS;
    }
}
