jest.mock('../../../../business-registry-service/src/infrastructure', () => ({
  businessRepository: {
    findById: jest.fn()
  }
}));

import { HttpBusinessRegistryClient } from './business-registry-client';
import { businessRepository } from '../../../../business-registry-service/src/infrastructure';
import { VerificationStatus } from '../../../../business-registry-service/src/domain/entities/business.entity';

const mockBusinessRepository = businessRepository as unknown as { findById: jest.Mock };

describe('HttpBusinessRegistryClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies business credentials and returns true only when verified flag is true', async () => {
    mockBusinessRepository.findById.mockResolvedValueOnce({
      id: 'biz-1',
      ownerId: 'user-1',
      verificationStatus: VerificationStatus.VERIFIED
    });
    const client = new HttpBusinessRegistryClient();

    await expect(client.verifyBusinessCredentials('user-1', 'biz-1')).resolves.toBe(true);

    mockBusinessRepository.findById.mockResolvedValueOnce({
      id: 'biz-1',
      ownerId: 'user-1',
      verificationStatus: VerificationStatus.UNVERIFIED
    });
    await expect(client.verifyBusinessCredentials('user-1', 'biz-1')).resolves.toBe(false);
  });

  it('loads business details, returning null on 404 and throwing on other errors', async () => {
    const client = new HttpBusinessRegistryClient();
    const payload = { id: 'biz-1', name: 'Biz One', industry: 'Retail', verificationStatus: VerificationStatus.VERIFIED };
    mockBusinessRepository.findById.mockResolvedValueOnce(payload);

    await expect(client.getBusinessDetails('biz-1')).resolves.toEqual(payload);

    mockBusinessRepository.findById.mockResolvedValueOnce(null);
    await expect(client.getBusinessDetails('biz-404')).resolves.toBeNull();
  });
});
