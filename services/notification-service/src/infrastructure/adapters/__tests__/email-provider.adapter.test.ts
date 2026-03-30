import nodemailer from 'nodemailer';
import { EmailProviderAdapter } from '../email-provider.adapter';

jest.mock('nodemailer', () => ({
    __esModule: true,
    default: {
        createTransport: jest.fn()
    }
}));

describe('EmailProviderAdapter', () => {
    let adapter: EmailProviderAdapter;
    const mockTransport = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
        verify: jest.fn((callback: (error?: Error | null) => void) => callback(null))
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SMTP_HOST = 'smtp.test.local';
        process.env.SMTP_USER = 'test-user';
        process.env.SMTP_PASS = 'test-pass';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_SECURE = 'false';
        process.env.SMTP_FROM = 'no-reply@test.local';
        process.env.SMTP_FROM_NAME = 'Test Mailer';
        (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransport);
        adapter = new EmailProviderAdapter();
    });

    it('should send email successfully', async () => {
        await adapter.send('test@example.com', 'Test', 'Test body');
        expect(mockTransport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: 'Test Mailer <no-reply@test.local>',
            to: 'test@example.com',
            subject: 'Test',
            text: 'Test body'
        }));
    });

    it('should allow html content', async () => {
        await adapter.send('test@example.com', 'Test', 'Test body', '<p>Test</p>');
        expect(mockTransport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            html: '<p>Test</p>'
        }));
    });
});
