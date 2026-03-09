const toDataURLMock = jest.fn();
const toBufferMock = jest.fn();

jest.mock('qrcode', () => ({
  toDataURL: (...args: unknown[]) => toDataURLMock(...args),
  toBuffer: (...args: unknown[]) => toBufferMock(...args)
}));

import { QRCodeService } from './qr-code.service';

describe('QRCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generateDataURL forwards options and returns QR code URL', async () => {
    toDataURLMock.mockResolvedValue('data:image/png;base64,abc123');
    const service = new QRCodeService();

    const result = await service.generateDataURL('otpauth://totp/App:user@example.com');

    expect(result).toBe('data:image/png;base64,abc123');
    expect(toDataURLMock).toHaveBeenCalledWith(
      'otpauth://totp/App:user@example.com',
      expect.objectContaining({
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: { dark: '#000000', light: '#ffffff' }
      })
    );
  });

  it('generateDataURL wraps generator failures with domain-specific message', async () => {
    toDataURLMock.mockRejectedValue(new Error('encoding failed'));
    const service = new QRCodeService();

    await expect(service.generateDataURL('otpauth://totp/fail')).rejects.toThrow(
      'Failed to generate QR code data URL.'
    );
  });

  it('generateBuffer returns QR image buffer', async () => {
    const buffer = Buffer.from('qr-image');
    toBufferMock.mockResolvedValue(buffer);
    const service = new QRCodeService();

    const result = await service.generateBuffer('otpauth://totp/App:user@example.com');

    expect(result).toBe(buffer);
    expect(toBufferMock).toHaveBeenCalledWith('otpauth://totp/App:user@example.com');
  });

  it('generateBuffer wraps generator errors', async () => {
    toBufferMock.mockRejectedValue(new Error('buffer failed'));
    const service = new QRCodeService();

    await expect(service.generateBuffer('otpauth://totp/fail')).rejects.toThrow(
      'Failed to generate QR code buffer.'
    );
  });
});
