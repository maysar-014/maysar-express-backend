import { GeoPoint } from '../value-objects/geopoint.value-object';
import { CODConfirmationEngine } from './cod-confirmation.engine';

describe('CODConfirmationEngine', () => {
  let engine: CODConfirmationEngine;

  beforeEach(() => {
    engine = new CODConfirmationEngine();
  });

  it('generates a 6-digit numeric OTP', () => {
    const otp = engine.generateOTP();

    expect(otp).toMatch(/^\d{6}$/);
  });

  it('calculates OTP expiry 24 hours from now', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const expiry = engine.calculateOTPExpiry();

    expect(expiry.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    jest.useRealTimers();
  });

  it('validates OTP value and expiry', () => {
    const validExpiry = new Date(Date.now() + 60_000);
    const expired = new Date(Date.now() - 60_000);

    expect(engine.validateOTP('123456', '123456', validExpiry)).toBe(true);
    expect(engine.validateOTP('123456', '999999', validExpiry)).toBe(false);
    expect(engine.validateOTP('123456', '123456', expired)).toBe(false);
  });

  it('checks proximity using GeoPoint distance', () => {
    const delivery = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
    const near = GeoPoint.create(-6.7928, 39.2083, 'Near point');
    const far = GeoPoint.create(-6.8124, 39.2083, 'Far point');

    expect(engine.isWithinProximity(near, delivery)).toBe(true);
    expect(engine.isWithinProximity(far, delivery)).toBe(false);
  });

    it('fails closed when the expected OTP is missing', () => {
        // Regression: the COD delivery OTP is generated in one request and
        // verified in another. When it was never persisted, `actualOtp` was
        // undefined and `new Date() > undefined` is false, so the expiry check
        // silently never fired. Verification must reject rather than
        // silently skip the control.
        
        const validExpiry = new Date(Date.now() + 10 * 60_000);

        expect(engine.validateOTP('123456', undefined as never, validExpiry)).toBe(false);
        expect(engine.validateOTP('123456', '' as never, validExpiry)).toBe(false);
    });

    it('fails closed when the OTP expiry is missing', () => {
        // Without an expiry the code could never be considered expired.
        

        expect(engine.validateOTP('123456', '123456', undefined as never)).toBe(false);
    });

});
