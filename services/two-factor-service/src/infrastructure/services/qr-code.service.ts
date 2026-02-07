import * as QRCode from 'qrcode';

export class QRCodeService {
    /**
     * Generates a Base64 Data URL for the QR code
     */
    public async generateDataURL(uri: string): Promise<string> {
        try {
            return await QRCode.toDataURL(uri, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
        } catch (error) {
            throw new Error('Failed to generate QR code data URL.');
        }
    }

    /**
     * Generates a Buffer for the QR code image
     */
    public async generateBuffer(uri: string): Promise<Buffer> {
        try {
            return await QRCode.toBuffer(uri);
        } catch (error) {
            throw new Error('Failed to generate QR code buffer.');
        }
    }
}
