import { AfricasTalkingSmsProvider } from '../africastalking-sms.provider';

global.fetch = jest.fn();

describe('AfricasTalkingSmsProvider', () => {
    let provider: AfricasTalkingSmsProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new AfricasTalkingSmsProvider({
            username: 'test-user',
            apiKey: 'test-key',
            senderId: 'TEST'
        });
    });

    describe('send', () => {
        it('should send SMS successfully', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    SMSMessageData: {
                        Recipients: [{
                            status: 'Success',
                            statusCode: 101,
                            messageId: 'at-msg-123',
                            cost: 'KES 0.80'
                        }]
                    }
                })
            });

            const result = await provider.send('+255612834684', 'Test message');

            expect(result.isSuccess()).toBe(true);
            expect(result.getProviderMessageId()).toBe('at-msg-123');
        });

        it('should handle API errors', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ message: 'Invalid request' })
            });

            const result = await provider.send('+255612834684', 'Test');

            expect(result.isSuccess()).toBe(false);
            expect(result.getErrorMessage()).toContain('Invalid request');
        });

        it('should handle no recipients', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    SMSMessageData: { Recipients: [] }
                })
            });

            const result = await provider.send('+255612834684', 'Test');

            expect(result.isSuccess()).toBe(false);
            expect(result.getErrorMessage()).toContain('No recipients');
        });

        it('should handle rejected messages', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    SMSMessageData: {
                        Recipients: [{
                            status: 'Failed',
                            statusCode: 401
                        }]
                    }
                })
            });

            const result = await provider.send('+255612834684', 'Test');

            expect(result.isSuccess()).toBe(false);
        });

        it('should handle network errors', async () => {
            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await provider.send('+255612834684', 'Test');

            expect(result.isSuccess()).toBe(false);
            expect(result.getErrorMessage()).toContain('Network error');
        });
    });

    describe('getStatus', () => {
        it('should return unknown status', async () => {
            const result = await provider.getStatus('msg-123');

            expect(result.getProviderMessageId()).toBe('msg-123');
        });
    });

    describe('getName', () => {
        it('should return provider name', () => {
            expect(provider.getName()).toBe('africastalking');
        });
    });

    describe('isHealthy', () => {
        it('should return true when API is healthy', async () => {
            (fetch as jest.Mock).mockResolvedValue({ ok: true });

            const result = await provider.isHealthy();

            expect(result).toBe(true);
        });

        it('should return false when API is down', async () => {
            (fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

            const result = await provider.isHealthy();

            expect(result).toBe(false);
        });
    });

    describe('getConfig', () => {
        it('should return provider config', () => {
            const config = provider.getConfig();

            expect(config.name).toBe('africastalking');
            expect(config.supportsDeliveryReports).toBe(true);
        });
    });

    describe('parseDeliveryReport', () => {
        it('should parse delivery report', () => {
            const body = {
                id: 'msg-123',
                status: 'Success',
                phoneNumber: '+255612834684'
            };

            const result = provider.parseDeliveryReport(body);

            expect(result?.providerMessageId).toBe('msg-123');
            expect(result?.status).toBe('delivered');
            expect(result?.phoneNumber).toBe('+255612834684');
        });

        it('should parse failed delivery', () => {
            const body = {
                id: 'msg-123',
                status: 'Failed',
                phoneNumber: '+255612834684',
                failureReason: 'Invalid number'
            };

            const result = provider.parseDeliveryReport(body);

            expect(result?.status).toBe('failed');
            expect(result?.failureReason).toBe('Invalid number');
        });

        it('should return null for invalid body', () => {
            const result = provider.parseDeliveryReport({});

            expect(result).toBeNull();
        });
    });
});
