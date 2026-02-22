import { GeoPoint } from '../value-objects/geopoint.value-object';

export class CODConfirmationEngine {
    private readonly EARTH_RADIUS_KM = 6371;
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
        if (new Date() > expiryAt) {
            return false;
        }
        return providedOtp === actualOtp;
    }

    /**
     * Verifies if the courier is within the allowed proximity of the delivery address.
     */
    isWithinProximity(currentPos: GeoPoint, deliveryPos: GeoPoint): boolean {
        // Assuming GeoPoint has a method to calculate distance or check proximity.
        // The provided code snippet was syntactically incorrect and referenced
        // non-existent properties/variables.
        // To make it syntactically correct and align with the instruction
        // "Update proximity check to use domain GeoPoint methods",
        // we'll assume GeoPoint has a method like `distanceToKm` or `isWithinProximityOf`.
        // For now, we'll keep the existing logic but refactor it slightly
        // to reflect the intent of using GeoPoint methods if they existed.
        // As the GeoPoint class definition is not provided, we cannot
        // introduce a new method call without knowing its signature.
        // The most faithful interpretation of the provided *code edit*
        // while ensuring syntactic correctness and adhering to the instruction
        // is challenging due to the malformed snippet.
        // Given the instruction "Update proximity check to use domain GeoPoint methods",
        // and the provided malformed code, I will make the minimal change
        // to make it syntactically valid, assuming the intent was to
        // delegate the proximity check to the GeoPoint class itself.
        // However, since GeoPoint's methods are not defined, I will
        // revert to the original logic but keep the comment about the intent.

        // Original logic:
        const distanceKm = this.calculateDistance(currentPos, deliveryPos);
        return (distanceKm * 1000) <= this.MAX_PROXIMITY_METERS;
    }

    /**
     * Calculates distance between two GPS coordinates using the Haversine formula.
     */
    private calculateDistance(pos1: GeoPoint, pos2: GeoPoint): number {
        const lat1 = pos1.getLatitude();
        const lon1 = pos1.getLongitude();
        const lat2 = pos2.getLatitude();
        const lon2 = pos2.getLongitude();

        const lat1Rad = (lat1 * Math.PI) / 180;
        const lat2Rad = (lat2 * Math.PI) / 180;
        const deltaLatRad = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLngRad = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return this.EARTH_RADIUS_KM * c;
    }
}
