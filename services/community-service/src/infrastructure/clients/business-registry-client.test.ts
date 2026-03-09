import axios from 'axios';
import { HttpBusinessRegistryClient } from './business-registry-client';

jest.mock('axios', () => ({
  create: jest.fn()
}));

describe('HttpBusinessRegistryClient', () => {
  const httpClient = {
    get: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue(httpClient);
  });

  it('verifies business credentials and returns true only when verified flag is true', async () => {
    httpClient.get.mockResolvedValueOnce({ data: { verified: true } });
    const client = new HttpBusinessRegistryClient('http://registry.local');

    await expect(client.verifyBusinessCredentials('user-1', 'biz-1')).resolves.toBe(true);
    expect(httpClient.get).toHaveBeenCalledWith('/businesses/biz-1/verify', {
      params: { userId: 'user-1' }
    });

    httpClient.get.mockResolvedValueOnce({ data: { verified: false } });
    await expect(client.verifyBusinessCredentials('user-1', 'biz-1')).resolves.toBe(false);
  });

  it('returns false for expected verification failures (400/404)', async () => {
    const client = new HttpBusinessRegistryClient('http://registry.local');

    httpClient.get.mockRejectedValueOnce({ message: 'not found', response: { status: 404 } });
    await expect(client.verifyBusinessCredentials('user-1', 'biz-404')).resolves.toBe(false);

    httpClient.get.mockRejectedValueOnce({ message: 'bad request', response: { status: 400 } });
    await expect(client.verifyBusinessCredentials('user-1', 'biz-400')).resolves.toBe(false);
  });

  it('throws wrapped errors for unexpected verification failures', async () => {
    const client = new HttpBusinessRegistryClient('http://registry.local');
    httpClient.get.mockRejectedValueOnce({ message: 'timeout', response: { status: 500 } });

    await expect(client.verifyBusinessCredentials('user-1', 'biz-1')).rejects.toThrow(
      'Business registry service error: timeout'
    );
  });

  it('loads business details, returning null on 404 and throwing on other errors', async () => {
    const client = new HttpBusinessRegistryClient('http://registry.local');
    const payload = { id: 'biz-1', name: 'Biz One', industry: 'Retail', verificationStatus: 'VERIFIED' };
    httpClient.get.mockResolvedValueOnce({ data: payload });

    await expect(client.getBusinessDetails('biz-1')).resolves.toEqual(payload);

    httpClient.get.mockRejectedValueOnce({ message: 'missing', response: { status: 404 } });
    await expect(client.getBusinessDetails('biz-404')).resolves.toBeNull();

    httpClient.get.mockRejectedValueOnce({ message: 'boom', response: { status: 500 } });
    await expect(client.getBusinessDetails('biz-err')).rejects.toThrow('Business registry service error: boom');
  });
});
