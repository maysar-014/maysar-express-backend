const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockReadFile = jest.fn().mockResolvedValue(Buffer.from('resolved-bytes'));
const mockFsPromises = {
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  readFile: mockReadFile
};

const mockSend = jest.fn().mockResolvedValue(undefined);
const mockS3ClientCtor = jest.fn().mockImplementation(() => ({
  send: mockSend
}));
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://signed.example/doc.pdf');

jest.mock('fs', () => ({
  promises: mockFsPromises
}));

jest.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
  S3Client: mockS3ClientCtor
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args)
}));

import { DocumentStorageService, getDocumentStorageConfig } from './document-storage';

describe('document storage', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.KYC_DOCUMENT_STORAGE_PROVIDER = 'local';
    process.env.KYC_DOCUMENT_UPLOAD_DESTINATION = 'C:\\tmp\\documents';
    process.env.KYC_DOCUMENT_SIGNED_URL_EXPIRATION = '120';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('builds config and stores local documents safely', async () => {
    const service = new DocumentStorageService(getDocumentStorageConfig());
    const buffer = Buffer.from('hello-world');

    const stored = await service.storeDocument({
      userId: 'user-1',
      documentType: 'kyc-id',
      buffer,
      originalFileName: 'Passport Copy.pdf',
      mimeType: 'application/pdf',
      metadata: { source: 'upload' }
    });

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
    expect(stored.provider).toBe('local');
    expect(stored.url).toMatch(/^file:\/\//);
    expect(stored.fileName).toBe('Passport Copy.pdf');
    expect(stored.checksumSha256).toHaveLength(64);
    expect(service.getConstraints()).toEqual({
      maxFileSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    });

    const access = await service.resolveDocumentAccess(stored);
    expect(access.kind).toBe('buffer');
    if (access.kind === 'buffer') {
      expect(access.buffer.toString()).toBe('resolved-bytes');
      expect(access.mimeType).toBe('application/pdf');
    }
  });

  it('uploads to s3 and resolves signed access for remote storage', async () => {
    process.env.KYC_DOCUMENT_STORAGE_PROVIDER = 's3';
    process.env.KYC_DOCUMENTS_BUCKET = 'kyc-docs';
    process.env.AWS_ACCESS_KEY_ID = 'access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret-key';

    const service = new DocumentStorageService(getDocumentStorageConfig());
    const stored = await service.storeDocument({
      userId: 'user-2',
      documentType: 'passport',
      buffer: Buffer.from('remote-bytes'),
      originalFileName: 'passport.png',
      mimeType: 'image/png'
    });

    expect(mockS3ClientCtor).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalled();
    expect(stored.provider).toBe('s3');
    expect(stored.bucket).toBe('kyc-docs');
    expect(stored.url).toContain('s3://kyc-docs/');

    const access = await service.resolveDocumentAccess({
      ...stored,
      provider: 's3'
    });

    expect(access).toEqual({
      kind: 'redirect',
      url: 'https://signed.example/doc.pdf',
      expiresAt: expect.any(String)
    });
    expect(mockGetSignedUrl).toHaveBeenCalled();
  });
});
