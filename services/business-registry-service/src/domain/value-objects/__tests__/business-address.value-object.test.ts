import { BusinessAddress } from '../business-address.value-object';

describe('BusinessAddress', () => {
  it('creates address and exposes normalized values', () => {
    const address = BusinessAddress.create({
      id: 'addr-1',
      type: 'MAIN',
      street: ' Samora Ave ',
      city: ' Dar ',
      region: ' Dar es Salaam ',
      postalCode: ' 11101 ',
      country: ' Tanzania ',
      isPrimary: true
    });

    expect(address.getId()).toBe('addr-1');
    expect(address.getStreet()).toBe('Samora Ave');
    expect(address.getCity()).toBe('Dar');
    expect(address.getRegion()).toBe('Dar es Salaam');
    expect(address.getPostalCode()).toBe('11101');
    expect(address.getCountry()).toBe('Tanzania');
    expect(address.isPrimary).toBe(true);
    expect(address.toString()).toContain('Samora Ave');
  });

  it('supports equality, validation helpers, and Tanzanian country detection', () => {
    const main = BusinessAddress.create({
      id: 'addr-2',
      type: 'MAIN',
      street: 'Street 1',
      city: 'Dar',
      region: 'Dar es Salaam',
      country: 'TZ',
      isPrimary: false
    });
    const sameId = BusinessAddress.create({
      id: 'addr-2',
      type: 'BRANCH',
      street: 'Street 2',
      city: 'Arusha',
      region: 'Arusha',
      country: 'Kenya',
      isPrimary: false
    });

    expect(main.equals(sameId)).toBe(true);
    expect(main.isTanzanian()).toBe(true);
    expect(main.isValid()).toBe(true);
  });

  it('rejects invalid address payloads', () => {
    expect(() =>
      BusinessAddress.create({
        id: 'addr-3',
        type: 'MAIN',
        street: '',
        city: 'Dar',
        region: 'Dar es Salaam',
        country: 'Tanzania',
        isPrimary: false
      })
    ).toThrow('Street is required');

    expect(() =>
      BusinessAddress.create({
        id: 'addr-3',
        type: 'MAIN',
        street: 'Street',
        city: '',
        region: 'Dar es Salaam',
        country: 'Tanzania',
        isPrimary: false
      })
    ).toThrow('City is required');
  });
});
