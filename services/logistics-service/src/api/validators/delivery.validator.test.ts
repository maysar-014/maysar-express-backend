type Chain = {
  notEmpty: jest.Mock;
  withMessage: jest.Mock;
  isLength: jest.Mock;
  optional: jest.Mock;
  isUUID: jest.Mock;
  isObject: jest.Mock;
  matches: jest.Mock;
  isFloat: jest.Mock;
  isIn: jest.Mock;
  isISO8601: jest.Mock;
  isArray: jest.Mock;
  isString: jest.Mock;
  isEmail: jest.Mock;
  isMobilePhone: jest.Mock;
  isInt: jest.Mock;
};

const makeChain = (): Chain => {
  const chain: Partial<Chain> = {};
  const link = () => chain as Chain;

  chain.notEmpty = jest.fn(link);
  chain.withMessage = jest.fn(link);
  chain.isLength = jest.fn(link);
  chain.optional = jest.fn(link);
  chain.isUUID = jest.fn(link);
  chain.isObject = jest.fn(link);
  chain.matches = jest.fn(link);
  chain.isFloat = jest.fn(link);
  chain.isIn = jest.fn(link);
  chain.isISO8601 = jest.fn(link);
  chain.isArray = jest.fn(link);
  chain.isString = jest.fn(link);
  chain.isEmail = jest.fn(link);
  chain.isMobilePhone = jest.fn(link);
  chain.isInt = jest.fn(link);

  return chain as Chain;
};

jest.mock(
  'express-validator',
  () => {
    const body = jest.fn(() => makeChain());
    const param = jest.fn(() => makeChain());
    const query = jest.fn(() => makeChain());
    return { body, param, query };
  },
  { virtual: true }
);

import { body, param, query } from 'express-validator';
import { CourierValidator, DeliveryValidator } from './delivery.validator';

const mockedBody = body as jest.Mock;
const mockedParam = param as jest.Mock;
const mockedQuery = query as jest.Mock;

describe('DeliveryValidator', () => {
  beforeEach(() => {
    mockedBody.mockClear();
    mockedParam.mockClear();
    mockedQuery.mockClear();
  });

  it('createDelivery builds validation chains for all required payload fields', () => {
    const chains = DeliveryValidator.createDelivery();

    expect(chains.length).toBeGreaterThan(20);
    const bodyFields = mockedBody.mock.calls.map(call => call[0]);

    expect(bodyFields).toContain('orderId');
    expect(bodyFields).toContain('courierId');
    expect(bodyFields).toContain('pickupAddress.street');
    expect(bodyFields).toContain('deliveryAddress.postalCode');
    expect(bodyFields).toContain('packageDetails.weight');
    expect(bodyFields).toContain('packageDetails.dimensions.height');
    expect(bodyFields).toContain('priority');
    expect(bodyFields).toContain('timeWindow.start');
    expect(bodyFields).toContain('specialRequirements.*');
    expect(bodyFields).toContain('sender.phone');
    expect(bodyFields).toContain('recipient.phone');
  });

  it('updateDeliveryStatus creates param and body validators for status/location updates', () => {
    const chains = DeliveryValidator.updateDeliveryStatus();

    expect(chains.length).toBeGreaterThan(8);
    expect(mockedParam).toHaveBeenCalledWith('deliveryId');

    const bodyFields = mockedBody.mock.calls.map(call => call[0]);
    expect(bodyFields).toContain('status');
    expect(bodyFields).toContain('location');
    expect(bodyFields).toContain('location.lat');
    expect(bodyFields).toContain('location.lng');
    expect(bodyFields).toContain('location.latitude');
    expect(bodyFields).toContain('location.longitude');
    expect(bodyFields).toContain('location.address');
    expect(bodyFields).toContain('recipientName');
    expect(bodyFields).toContain('notes');
    expect(bodyFields).toContain('reason');
  });

  it('getDeliveries creates query validators for filters and pagination', () => {
    const chains = DeliveryValidator.getDeliveries();

    expect(chains.length).toBe(4);
    const queryFields = mockedQuery.mock.calls.map(call => call[0]);

    expect(queryFields).toEqual(expect.arrayContaining(['status', 'courierId', 'page', 'limit']));
  });
});

describe('CourierValidator', () => {
  beforeEach(() => {
    mockedBody.mockClear();
    mockedParam.mockClear();
    mockedQuery.mockClear();
  });

  it('createCourier defines validators for registration payload', () => {
    const chains = CourierValidator.createCourier();

    expect(chains.length).toBe(7);
    const bodyFields = mockedBody.mock.calls.map(call => call[0]);

    expect(bodyFields).toEqual(
      expect.arrayContaining([
        'name',
        'email',
        'phone',
        'vehicleType',
        'licenseNumber',
        'workingHours',
        'serviceArea'
      ])
    );
  });

  it('updateCourierLocation defines param and telemetry field validators', () => {
    const chains = CourierValidator.updateCourierLocation();

    expect(chains.length).toBe(5);
    expect(mockedParam).toHaveBeenCalledWith('courierId');
    const bodyFields = mockedBody.mock.calls.map(call => call[0]);
    expect(bodyFields).toEqual(
      expect.arrayContaining(['latitude', 'longitude', 'heading', 'speed'])
    );
  });
});
