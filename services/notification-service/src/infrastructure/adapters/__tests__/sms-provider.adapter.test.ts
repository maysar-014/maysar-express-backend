const mockProvider = {
    send: jest.fn().mockResolvedValue({
        isFailure: () => false,
        getErrorMessage: () => undefined
    })
};

jest.mock('../../../sms/infrastructure/container', () => ({
    container: {
        get: () => mockProvider
    }
}));

jest.mock('../../../sms/infrastructure/types', () => ({
    TYPES: { SmsProvider: Symbol.for('SmsProvider') }
}));

import { SmsProviderAdapter } from '../sms-provider.adapter';

describe('SmsProviderAdapter', () => {
    let adapter: SmsProviderAdapter;

    beforeEach(() => {
        mockProvider.send.mockClear();
        adapter = new SmsProviderAdapter();
    });

    it('should send SMS successfully', async () => {
        await adapter.send('+255612834684', 'Test message');
        expect(mockProvider.send).toHaveBeenCalledTimes(1);
        expect(true).toBe(true);
    });
});
