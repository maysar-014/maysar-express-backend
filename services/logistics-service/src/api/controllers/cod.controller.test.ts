const mockContainer = {
  getInitiateCODDeliveryUseCase: jest.fn(),
  getVerifyCODDeliveryUseCase: jest.fn()
};

jest.mock('../../infrastructure/container', () => ({
  DependencyContainer: {
    getInstance: () => mockContainer
  }
}));

import { CODController } from './cod.controller';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CODController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generateOTP responds with success when use case succeeds', async () => {
    mockContainer.getInitiateCODDeliveryUseCase.mockReturnValue({
      execute: jest.fn().mockResolvedValue(undefined)
    });
    const controller = new CODController();
    const req: any = { params: { deliveryId: 'del-1' } };
    const res = createResponse();

    await controller.generateOTP(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'OTP generated and sent to buyer'
    });
  });

  it('generateOTP responds with error on use case failure', async () => {
    mockContainer.getInitiateCODDeliveryUseCase.mockReturnValue({
      execute: jest.fn().mockRejectedValue(new Error('failed'))
    });
    const controller = new CODController();
    const req: any = { params: { deliveryId: 'del-1' } };
    const res = createResponse();

    await controller.generateOTP(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'failed' });
  });

  it('verifyDelivery validates required fields before calling use case', async () => {
    const controller = new CODController();
    const req: any = { params: { deliveryId: 'del-1' }, body: { otp: '', location: {} } };
    const res = createResponse();

    await controller.verifyDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Missing required verification data (otp, lat, lng)'
    });
  });

  it('verifyDelivery calls use case with a real GeoPoint, not a plain lat/lng object', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    mockContainer.getVerifyCODDeliveryUseCase.mockReturnValue({ execute });
    const controller = new CODController();
    const req: any = {
      params: { deliveryId: 'del-1' },
      body: { otp: '123456', location: { lat: '1.25', lng: '2.75' } }
    };
    const res = createResponse();

    await controller.verifyDelivery(req, res);

    expect(execute).toHaveBeenCalledTimes(1);
    const passed = execute.mock.calls[0][0];
    expect(passed.deliveryId).toBe('del-1');
    expect(passed.otp).toBe('123456');

    // The settlement saga calls `currentPos.distanceTo(deliveryPos)`, so anything
    // without a real GeoPoint throws a TypeError inside the saga and the delivery
    // silently stays in_transit while this endpoint still returns 200. This
    // assertion is the regression guard for exactly that.
    expect(passed.location).toBeInstanceOf(GeoPoint);
    expect(typeof passed.location.distanceTo).toBe('function');
    expect(passed.location.getLatitude()).toBe(1.25);
    expect(passed.location.getLongitude()).toBe(2.75);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('verifyDelivery responds with structured failure payload', async () => {
    mockContainer.getVerifyCODDeliveryUseCase.mockReturnValue({
      execute: jest.fn().mockRejectedValue(new Error('otp mismatch'))
    });
    const controller = new CODController();
    const req: any = {
      params: { deliveryId: 'del-1' },
      body: { otp: '111111', location: { lat: 1, lng: 2 } }
    };
    const res = createResponse();

    await controller.verifyDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'COD_VERIFICATION_FAILED',
        message: 'otp mismatch'
      }
    });
  });
});
