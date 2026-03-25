import express from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { eventBus, EventBus } from '@shared-events/eventBus';
import { t } from '@shared/i18n/i18n';
import { i18next, i18nextMiddleware } from '@shared/i18n/i18n';
import { z } from 'zod';
import { isSystemId } from '@shared/validation/id';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { PrismaComplianceRepository } from './infrastructure/repositories/prisma-compliance.repository';
import { createPrismaClient } from '@shared/database/prisma-client';
import { DocumentStorageService, StoredDocumentMetadata } from '@shared/storage/document-storage';

const Busboy = require('busboy');

const parseOrRespond = (schema: z.ZodSchema, data: any, res: express.Response) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(422).json({ success: false, errors: result.error.errors });
    return null;
  }
  return result.data;
};

const supportedIdSchema = z
  .string()
  .trim()
  .refine((value) => isSystemId(value), { message: 'Expected system ID' });
const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F]+$/u;
const safeVisibleStringSchema = z.string().min(1).regex(SAFE_VISIBLE_STRING_PATTERN, {
  message: 'Expected a non-empty printable string'
});
const documentTypeSchema = z.enum(['national_id', 'passport', 'drivers_license', 'proof_of_address']);
const optionalSagaIdSchema = safeVisibleStringSchema.optional();
const metadataSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}, z.record(z.any()).optional());

const requireDocumentUrlOrFileUrl = (
  value: { documentUrl?: string; fileUrl?: string },
  ctx: z.RefinementCtx
) => {
  if (!value.documentUrl && !value.fileUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'documentUrl or fileUrl is required',
      path: ['documentUrl']
    });
  }
};

const kycDocumentFieldsSchema = z.object({
  userId: supportedIdSchema,
  documentType: documentTypeSchema,
  fileName: safeVisibleStringSchema.optional(),
  mimeType: safeVisibleStringSchema.optional(),
  fileSizeBytes: z.coerce.number().int().positive().optional(),
  issuingCountry: z.string().trim().regex(/^[A-Za-z]{2,3}$/).optional(),
  documentNumber: safeVisibleStringSchema.min(3).optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: metadataSchema
});

const kycDocumentSubmissionObjectSchema = kycDocumentFieldsSchema.extend({
  documentUrl: z.string().url().optional(),
  fileUrl: z.string().url().optional()
}).strict();

const kycDocumentSubmissionSchema = kycDocumentSubmissionObjectSchema.superRefine(requireDocumentUrlOrFileUrl);

const verifyDocumentSchema = kycDocumentSubmissionObjectSchema.extend({
  sagaId: optionalSagaIdSchema
}).strict().superRefine(requireDocumentUrlOrFileUrl);
type KycDocumentSubmissionInput = z.infer<typeof kycDocumentSubmissionSchema>;
const kycMultipartUploadSchema = z.object({
  userId: supportedIdSchema,
  documentType: documentTypeSchema,
  fileName: safeVisibleStringSchema.optional(),
  mimeType: safeVisibleStringSchema,
  fileSizeBytes: z.coerce.number().int().positive().optional(),
  issuingCountry: z.string().trim().regex(/^[A-Za-z]{2,3}$/).optional(),
  documentNumber: safeVisibleStringSchema.min(3).optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
}).strict();

const manualReviewSchema = z.object({
  userId: supportedIdSchema,
  decision: z.enum(['approved', 'rejected', 'under_review']),
  reviewerId: supportedIdSchema,
  sagaId: optionalSagaIdSchema
});

const riskAssessmentSchema = z.object({
  userId: supportedIdSchema,
  assessmentType: safeVisibleStringSchema,
  sagaId: optionalSagaIdSchema
}).strict();

const monitorSchema = z.object({
  complianceType: z.literal('kyc'),
  entityId: z.string(),
  operation: z.string(),
  sagaId: optionalSagaIdSchema
});

const generateReportSchema = z.object({
  reportType: z.literal('kyc'),
  period: safeVisibleStringSchema,
  requestedBy: safeVisibleStringSchema,
  sagaId: optionalSagaIdSchema
}).strict();

const auditLogSchema = z.object({
  userId: supportedIdSchema,
  action: safeVisibleStringSchema,
  resource: safeVisibleStringSchema,
  resourceId: safeVisibleStringSchema,
  details: z.record(z.any()).optional(),
  sagaId: optionalSagaIdSchema
}).strict();

const kycStatusParamSchema = z.object({
  userId: supportedIdSchema
});

const kycDocumentContentParamSchema = z.object({
  verificationId: supportedIdSchema
});

const amlRecordSchema = z.object({
  userId: supportedIdSchema,
  sanctionsStatus: z.string().min(1).optional(),
  pepStatus: z.boolean().optional(),
  riskScore: z.number().min(0).max(100).optional(),
  flags: z.record(z.any()).optional(),
  sagaId: optionalSagaIdSchema
});

const subjectRightsRequestSchema = z.object({
  userId: supportedIdSchema,
  requestType: z.enum(['access', 'delete', 'portability', 'rectification']),
  reason: z.string().optional(),
  payload: z.record(z.any()).optional(),
  sagaId: optionalSagaIdSchema
});

const dataDeletionLogSchema = z.object({
  userId: supportedIdSchema,
  dataType: z.string().min(1),
  recordsDeleted: z.number().int().nonnegative(),
  requestedBy: supportedIdSchema,
  reason: z.string().min(1),
  sagaId: optionalSagaIdSchema
});

const dataRetentionPolicySchema = z.object({
  dataType: safeVisibleStringSchema,
  retentionPeriod: z.number().int().positive(),
  legalBasis: safeVisibleStringSchema,
  applicableLaw: safeVisibleStringSchema,
  autoDelete: z.boolean().default(true),
  nextReviewDate: z.string().datetime().transform((value) => new Date(value)),
  sagaId: optionalSagaIdSchema
}).strict();

const dataProcessingRecordSchema = z.object({
  purpose: z.string().min(1),
  categories: z.record(z.any()),
  recipients: z.record(z.any()),
  retentionPeriod: z.string().min(1),
  securityMeasures: z.record(z.any()),
  sagaId: optionalSagaIdSchema
});

const privacyImpactAssessmentSchema = z.object({
  projectName: z.string().min(1),
  assessor: z.string().min(1),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  findings: z.record(z.any()).optional(),
  recommendations: z.record(z.any()).optional(),
  status: z.enum(['in_progress', 'completed', 'requires_action']).optional(),
  sagaId: optionalSagaIdSchema
});

const tcraRecordSchema = z.object({
  userId: supportedIdSchema,
  licenseNumber: z.string().optional(),
  status: z.string().optional(),
  registrationAt: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  lastAuditAt: z.coerce.date().optional(),
  auditFindings: z.record(z.any()).optional(),
  sagaId: optionalSagaIdSchema
});

const traRecordSchema = z.object({
  userId: supportedIdSchema,
  tin: z.string().min(1),
  vrn: z.string().optional(),
  taxComplianceStatus: z.string().optional(),
  lastFiscalCheck: z.coerce.date().optional(),
  efdStatus: z.string().optional(),
  sagaId: optionalSagaIdSchema
});

const marketRecordSchema = z.object({
  sellerId: supportedIdSchema,
  ethicalScore: z.number().min(0).max(100).optional(),
  qualityStatus: z.string().optional(),
  certifications: z.record(z.any()).optional(),
  lastAuditAt: z.coerce.date().optional(),
  sagaId: optionalSagaIdSchema
});

const compactObject = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));

const isMultipartRequest = (req: express.Request): boolean => Boolean(req.is('multipart/form-data') || req.is('multipart/*'));

interface UploadedMultipartFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const MULTIPART_PARSE_TIMEOUT_MS = (() => {
  const raw = Number(process.env.KYC_MULTIPART_PARSE_TIMEOUT_MS || '10000');
  return Number.isFinite(raw) && raw > 0 ? raw : 10000;
})();

const normalizeMultipartError = (error: unknown): Error => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if ((error as any).code === 'LIMIT_FILE_SIZE') {
      return new Error('Uploaded file exceeds the maximum allowed size');
    }
    if ((error as any).code === 'LIMIT_FILE_COUNT') {
      return new Error('Only one file upload is allowed');
    }
    if (/unexpected end of form/i.test(message) || /multipart/i.test(message) || /boundary/i.test(message)) {
      return new Error('Malformed multipart form data');
    }
    return error;
  }

  if (typeof error === 'string') {
    if (/unexpected end of form/i.test(error) || /multipart/i.test(error) || /boundary/i.test(error)) {
      return new Error('Malformed multipart form data');
    }
    return new Error(error);
  }

  return new Error('Malformed multipart form data');
};

const hasPrivilegedKycAccess = (roles: string[] = []): boolean => {
  const normalizedRoles = roles.map(role => role.toLowerCase());
  return normalizedRoles.includes('admin')
    || normalizedRoles.includes('system')
    || normalizedRoles.includes('compliance');
};

const assertKycDocumentAccess = (req: express.Request, res: express.Response, userId: string): boolean => {
  const service = (req as any).service;
  if (service) return true;

  const user = (req as any).user as { userId?: string; roles?: string[] } | undefined;
  if (!user) return true;

  if (user.userId === userId || hasPrivilegedKycAccess(user.roles)) {
    return true;
  }

  res.status(403).json({
    success: false,
    error: 'Forbidden'
  });
  return false;
};

const buildKycDocumentAccessUrl = (req: express.Request, verificationId: string): string =>
  `${req.baseUrl || ''}/kyc/documents/${verificationId}/content`;

const extractStoredDocumentMetadata = (value: unknown): StoredDocumentMetadata | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const url = candidate.url;
  if (typeof url !== 'string') {
    return null;
  }

  return {
    provider: (candidate.storageProvider as StoredDocumentMetadata['provider']) || 'local',
    key: typeof candidate.storageKey === 'string' ? candidate.storageKey : undefined,
    bucket: typeof candidate.storageBucket === 'string' ? candidate.storageBucket : undefined,
    url,
    fileName: typeof candidate.fileName === 'string' ? candidate.fileName : 'document',
    mimeType: typeof candidate.mimeType === 'string' ? candidate.mimeType : 'application/octet-stream',
    fileSizeBytes: typeof candidate.fileSizeBytes === 'number' ? candidate.fileSizeBytes : 0,
    checksumSha256: typeof candidate.checksumSha256 === 'string' ? candidate.checksumSha256 : '',
    uploadedAt: typeof candidate.uploadedAt === 'string' ? candidate.uploadedAt : new Date().toISOString()
  };
};

const resolveAcceptedUploadMimeType = (
  uploadedMimeType: string | undefined,
  declaredMimeType: string | undefined,
  allowedMimeTypes: string[]
): string => {
  const normalizedDeclared = declaredMimeType?.trim();
  if (normalizedDeclared && allowedMimeTypes.includes(normalizedDeclared)) {
    return normalizedDeclared;
  }

  const normalizedUploaded = uploadedMimeType?.trim();
  if (normalizedUploaded && allowedMimeTypes.includes(normalizedUploaded)) {
    return normalizedUploaded;
  }

  throw new Error(`Unsupported document MIME type: ${normalizedDeclared || normalizedUploaded || 'unknown'}`);
};

const normalizeKycDocumentSubmission = (
  validated: KycDocumentSubmissionInput,
  storedDocument?: StoredDocumentMetadata
) => {
  const normalizedUrl = validated.documentUrl ?? validated.fileUrl!;
  const documentPayload = compactObject({
    type: validated.documentType,
    url: normalizedUrl,
    fileName: validated.fileName,
    mimeType: validated.mimeType,
    fileSizeBytes: validated.fileSizeBytes,
    issuingCountry: validated.issuingCountry?.toUpperCase(),
    documentNumber: validated.documentNumber,
    issuedAt: validated.issuedAt,
    expiresAt: validated.expiresAt,
    metadata: validated.metadata,
    storageProvider: storedDocument?.provider,
    storageBucket: storedDocument?.bucket,
    storageKey: storedDocument?.key,
    checksumSha256: storedDocument?.checksumSha256,
    uploadedAt: storedDocument?.uploadedAt
  });

  return {
    normalizedUrl,
    expiryDate: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
    documentPayload
  };
};

const createKycSubmission = async (
  prisma: PrismaClient,
  eventBus: EventBus,
  validated: KycDocumentSubmissionInput,
  sagaId?: string,
  storedDocument?: StoredDocumentMetadata
) => {
  const { userId, documentType } = validated;
  const { normalizedUrl, expiryDate, documentPayload } = normalizeKycDocumentSubmission(validated, storedDocument);

  const verification = await prisma.compliance_KYCRecord.create({
    data: {
      id: makeId(getModelPrefix('Compliance_KYCRecord')),
      userId,
      documents: documentPayload as Prisma.InputJsonValue,
      verificationStatus: 'pending',
      expiryDate
    }
  });

  await eventBus.publish('DocumentUploadValidationStarted.v1', {
    userId,
    documentType,
    documentUrl: normalizedUrl,
    sagaId
  });

  const validationResult = { confidence: 0.85, extractedData: { name: 'John Doe' } };

  await eventBus.publish('AutomatedValidationCompleted.v1', {
    userId,
    documentType,
    documentUrl: normalizedUrl,
    validationResult,
    sagaId
  });

  return {
    verification,
    normalizedUrl,
    documentPayload
  };
};

const respondWithKycSubmission = async (
  prisma: PrismaClient,
  eventBus: EventBus,
  validated: KycDocumentSubmissionInput,
  req: express.Request,
  res: express.Response,
  successStatusCode: number,
  storedDocument?: StoredDocumentMetadata
) => {
  const { verification, normalizedUrl, documentPayload } = await createKycSubmission(
    prisma,
    eventBus,
    validated,
    undefined,
    storedDocument
  );

  res.status(successStatusCode).json({
    success: true,
    submissionId: verification.id,
    verificationId: verification.id,
    status: verification.verificationStatus ?? 'pending',
    data: {
      userId: validated.userId,
      documentType: validated.documentType,
      documentUrl: normalizedUrl,
      fileName: documentPayload.fileName ?? null,
      mimeType: documentPayload.mimeType ?? null,
      fileSizeBytes: documentPayload.fileSizeBytes ?? null,
      documentAccessUrl: buildKycDocumentAccessUrl(req, verification.id),
      storageProvider: documentPayload.storageProvider ?? null,
      submittedAt: verification.submittedAt ?? new Date(),
      verificationStatus: verification.verificationStatus ?? 'pending'
    }
  });
};

interface ComplianceAppDependencies {
  documentStorage?: DocumentStorageService;
}

export const createApp = (
  prisma: PrismaClient,
  eventBus: EventBus,
  dependencies: ComplianceAppDependencies = {}
) => {
const app = express();
const complianceRepository = new PrismaComplianceRepository(prisma);
const documentStorage = dependencies.documentStorage ?? new DocumentStorageService();
const uploadConstraints = documentStorage.getConstraints();
const runDocumentUpload = (req: express.Request) => new Promise<void>((resolve, reject) => {
  let settled = false;
  let uploadedFile: UploadedMultipartFile | undefined;
  const fields: Record<string, string> = {};
  let timeoutHandle: NodeJS.Timeout | undefined;

  const parser = Busboy({
    headers: req.headers,
    limits: {
      files: 1,
      fileSize: uploadConstraints.maxFileSizeBytes
    }
  });

  const cleanup = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = undefined;
    }
    req.off('aborted', onAborted);
    req.off('error', onRequestError);
    req.socket?.off('error', onSocketError);
    try {
      req.unpipe(parser);
    } catch {}
  };

  const finish = (error?: unknown) => {
    if (settled) return;
    settled = true;
    cleanup();
    if (error) {
      reject(normalizeMultipartError(error));
      return;
    }
    resolve();
  };

  const onAborted = () => finish(new Error('Malformed multipart form data'));
  const onRequestError = (error: unknown) => finish(error);
  const onSocketError = (error: unknown) => finish(error);

  req.once('aborted', onAborted);
  req.once('error', onRequestError);
  req.socket?.once('error', onSocketError);
  timeoutHandle = setTimeout(() => {
    try {
      req.unpipe(parser);
    } catch {}
    try {
      req.resume();
    } catch {}
    if (typeof (parser as { destroy?: (error?: Error) => void }).destroy === 'function') {
      try {
        (parser as { destroy?: (error?: Error) => void }).destroy?.(new Error('Multipart upload timed out'));
      } catch {}
    }
    finish(new Error('Multipart upload timed out'));
  }, MULTIPART_PARSE_TIMEOUT_MS);

  try {
    parser.on('field', (name: string, value: string, info: { nameTruncated?: boolean; valueTruncated?: boolean }) => {
      if (settled) return;
      if (info?.nameTruncated || info?.valueTruncated) {
        finish(new Error('Malformed multipart form data'));
        return;
      }
      fields[name] = value;
    });

    parser.on('file', (
      name: string,
      stream: NodeJS.ReadableStream & { truncated?: boolean },
      info: { filename?: string; mimeType?: string; mime?: string }
    ) => {
      if (settled) {
        stream.resume();
        return;
      }

      if (name !== 'file') {
        stream.resume();
        return;
      }

      const chunks: Buffer[] = [];
      let size = 0;
      let truncated = false;

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.length;
      });

      stream.on('limit', () => {
        truncated = true;
      });

      stream.on('error', (error: unknown) => finish(error));

      stream.on('end', () => {
        if (truncated || stream.truncated) {
          finish(new Error('Uploaded file exceeds the maximum allowed size'));
          return;
        }

        uploadedFile = {
          buffer: Buffer.concat(chunks),
          originalname: info.filename || 'upload',
          mimetype: info.mimeType || info.mime || 'application/octet-stream',
          size
        };
      });
    });

    parser.on('filesLimit', () => finish(new Error('Only one file upload is allowed')));
    parser.on('error', (error: unknown) => {
      if (settled) {
        return;
      }
      finish(error);
    });
    parser.on('finish', () => {
      if (settled) return;
      (req as any).body = fields;
      if (uploadedFile) {
        (req as any).file = uploadedFile;
      }
      finish();
    });

    req.pipe(parser);
  } catch (error) {
    finish(error);
  }
});

app.use(express.json());
app.use(i18nextMiddleware.handle(i18next));

const handleKycSubmissionRequest = async (req: express.Request, res: express.Response) => {
  let validated: KycDocumentSubmissionInput | null = null;
  let storedDocument: StoredDocumentMetadata | undefined;

  if (isMultipartRequest(req)) {
    await runDocumentUpload(req);

    const uploadInput = parseOrRespond(kycMultipartUploadSchema, req.body, res);
    if (!uploadInput) return;
    if (!assertKycDocumentAccess(req, res, uploadInput.userId)) return;

    const uploadedFile = (req as any).file as {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    } | undefined;

    if (!uploadedFile) {
      res.status(422).json({
        success: false,
        errors: [{
          message: 'file is required',
          path: ['file']
        }]
      });
      return;
    }

    const effectiveMimeType = resolveAcceptedUploadMimeType(
      uploadedFile.mimetype,
      uploadInput.mimeType,
      uploadConstraints.allowedMimeTypes
    );

    if (uploadInput.fileSizeBytes !== undefined && uploadInput.fileSizeBytes !== uploadedFile.size) {
      res.status(422).json({
        success: false,
        errors: [{
          message: 'fileSizeBytes must match uploaded file size',
          path: ['fileSizeBytes']
        }]
      });
      return;
    }

    storedDocument = await documentStorage.storeDocument({
      userId: uploadInput.userId,
      documentType: uploadInput.documentType,
      buffer: uploadedFile.buffer,
      originalFileName: uploadInput.fileName ?? uploadedFile.originalname,
      mimeType: effectiveMimeType,
      metadata: uploadInput.metadata
    });

    validated = {
      ...uploadInput,
      documentUrl: storedDocument.url,
      fileUrl: storedDocument.url,
      fileName: uploadInput.fileName ?? storedDocument.fileName,
      mimeType: effectiveMimeType,
      fileSizeBytes: uploadInput.fileSizeBytes ?? storedDocument.fileSizeBytes,
      metadata: {
        ...(uploadInput.metadata || {}),
        storage: compactObject({
          provider: storedDocument.provider,
          bucket: storedDocument.bucket,
          key: storedDocument.key,
          checksumSha256: storedDocument.checksumSha256
        })
      }
    };
  } else {
    validated = parseOrRespond(kycDocumentSubmissionSchema, req.body, res);
    if (!validated) return;
    if (!assertKycDocumentAccess(req, res, validated.userId)) return;
  }

  if (!validated) return;
  await respondWithKycSubmission(prisma, eventBus, validated, req, res, 201, storedDocument);
};

// KYC Document Verification
app.post('/kyc/submissions', async (req, res) => {
  try {
    await handleKycSubmissionRequest(req, res);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/kyc/documents', async (req, res) => {
  try {
    await handleKycSubmissionRequest(req, res);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/verify-document', async (req, res) => {
  const validated = parseOrRespond(verifyDocumentSchema, req.body, res);
  if (!validated) return;
  if (!assertKycDocumentAccess(req, res, validated.userId)) return;

  const { sagaId } = validated;

  try {
    const { verification, normalizedUrl, documentPayload } = await createKycSubmission(
      prisma,
      eventBus,
      validated,
      sagaId
    );

    res.json({
      success: true,
      verificationId: verification.id,
      submissionId: verification.id,
      status: verification.verificationStatus ?? 'pending',
      data: {
        userId: validated.userId,
        documentType: validated.documentType,
        documentUrl: normalizedUrl,
        fileName: documentPayload.fileName ?? null,
        mimeType: documentPayload.mimeType ?? null,
        fileSizeBytes: documentPayload.fileSizeBytes ?? null,
        documentAccessUrl: buildKycDocumentAccessUrl(req, verification.id),
        storageProvider: documentPayload.storageProvider ?? null,
        submittedAt: verification.submittedAt ?? new Date(),
        verificationStatus: verification.verificationStatus ?? 'pending'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/kyc/documents/:verificationId/content', async (req, res) => {
  const validated = parseOrRespond(kycDocumentContentParamSchema, req.params, res);
  if (!validated) return;

  try {
    const record = await prisma.compliance_KYCRecord.findFirst({
      where: { id: validated.verificationId }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'KYC record not found' });
    }

    if (!assertKycDocumentAccess(req, res, record.userId)) return;

    const storedDocument = extractStoredDocumentMetadata(record.documents);
    if (!storedDocument) {
      return res.status(404).json({ success: false, error: 'Stored document metadata not found' });
    }

    const access = await documentStorage.resolveDocumentAccess(storedDocument);
    if (access.kind === 'redirect') {
      return res.redirect(302, access.url);
    }

    res.setHeader('Content-Type', access.mimeType);
    res.setHeader('Content-Length', access.size.toString());
    res.setHeader('Content-Disposition', `inline; filename=\"${access.fileName}\"`);
    res.status(200).send(access.buffer);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Manual Review
app.post('/manual-review', async (req, res) => {
  const validated = parseOrRespond(manualReviewSchema, req.body, res);
  if (!validated) return;

  const { userId, decision, reviewerId, sagaId } = validated;

  try {
    const eligibleStatuses = ['pending', 'under_review'] as const;
    const currentRecord = await prisma.compliance_KYCRecord.findFirst({
      where: {
        userId,
        verificationStatus: { in: [...eligibleStatuses] }
      },
      orderBy: { submittedAt: 'desc' }
    });

    if (!currentRecord) {
      return res.status(404).json({ success: false, error: 'No pending/under_review record found for user' });
    }

    const updateResult = await prisma.compliance_KYCRecord.updateMany({
      where: { id: currentRecord.id },
      data: { verificationStatus: decision, verifiedBy: reviewerId, verifiedAt: new Date() }
    });

    if (updateResult.count === 0) {
      return res.status(404).json({ success: false, error: 'No record updated for user' });
    }

    await eventBus.publish('KYCStatusChanged.v1', {
      userId,
      previousStatus: currentRecord.verificationStatus,
      newStatus: decision,
      changedBy: reviewerId,
      sagaId,
      timestamp: new Date().toISOString()
    });

    await eventBus.publish('ManualReviewCompleted.v1', { userId, decision, sagaId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Risk Assessment
app.post('/risk-assessment', async (req, res) => {
  const validated = parseOrRespond(riskAssessmentSchema, req.body, res);
  if (!validated) return;

  const { userId, sagaId } = validated;

  try {
    const kycRecord = await prisma.compliance_KYCRecord.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' }
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const auditCount = await prisma.compliance_ComplianceAuditLog.count({
      where: {
        userId,
        timestamp: { gte: ninetyDaysAgo }
      }
    });

    const riskLevelMap = { low: 20, medium: 50, high: 80, critical: 90 };
    const baseScore = kycRecord ? riskLevelMap[kycRecord.riskLevel] : 50;
    const riskScore = Math.min(100, baseScore + auditCount * 2);

    const riskData = {
      transactionHistory: [],
      geographicRisk: 'low',
      industryRisk: 'medium'
    };

    await eventBus.publish('RiskDataCollected.v1', { userId, riskData, sagaId });
    await eventBus.publish('RiskScoreCalculated.v1', { userId, riskScore, sagaId });

    const complianceResult = {
      sanctionsCheck: 'clear',
      pepCheck: 'clear',
      adverseMediaCheck: 'clear'
    };

    await eventBus.publish('ComplianceCheckCompleted.v1', { userId, complianceResult, sagaId });

    const amlRecordId = await complianceRepository.upsertAmlRecord({
      userId,
      sanctionsStatus: complianceResult.sanctionsCheck,
      pepStatus: complianceResult.pepCheck !== 'clear',
      riskScore,
      flags: { complianceResult }
    });

    await eventBus.publish('AMLRecordUpdated.v1', {
      userId,
      amlRecordId,
      riskScore,
      sagaId
    });

    const riskDecision = riskScore > 80 ? 'reject' : 'accept';
    await eventBus.publish('RiskDecisionMade.v1', { userId, riskDecision, sagaId });

    res.json({ success: true, riskScore, decision: riskDecision });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Compliance Monitoring
app.post('/monitor', async (req, res) => {
  const validated = parseOrRespond(monitorSchema, req.body, res);
  if (!validated) return;

  const { complianceType, entityId, operation, sagaId } = validated;

  try {
    const complianceResult = { status: 'compliant', score: 95.5 };

    await eventBus.publish('ComplianceCheckCompleted.v1', {
      complianceType, entityId, complianceResult, sagaId
    });

    await eventBus.publish('ComplianceRecorded.v1', {
      complianceType, entityId, operation, sagaId
    });

    res.json({ success: true, result: complianceResult });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Report Generation
app.post('/generate-report', async (req, res) => {
  const validated = parseOrRespond(generateReportSchema, req.body, res);
  if (!validated) return;

  const { reportType, requestedBy, sagaId } = validated;

  try {
    const totalCount = await prisma.compliance_KYCRecord.count();
    const statusGroups = await prisma.compliance_KYCRecord.groupBy({
      by: ['verificationStatus'],
      _count: true
    });

    const getCount = (status: string) => {
      const group: any = statusGroups.find(g => g.verificationStatus === status);
      return group ? (typeof group._count === 'number' ? group._count : group._count?._all || 0) : 0;
    };

    const reportData = {
      kycVerifications: totalCount,
      approvedCount: getCount('approved'),
      rejectedCount: getCount('rejected'),
      pendingCount: getCount('pending'),
      under_reviewCount: getCount('under_review')
    };

    await eventBus.publish('ComplianceReportDataCollected.v1', {
      reportType, reportData, sagaId
    });

    const analysis = { overallScore: 96.2, trends: 'improving' };
    await eventBus.publish('ComplianceAnalysisCompleted.v1', {
      reportType, analysis, sagaId
    });

    const reportId = `compliance_${reportType}_${Date.now()}`;
    await eventBus.publish('ComplianceReportGenerated.v1', {
      reportType, reportId, sagaId
    });

    await eventBus.publish('ComplianceReportDistributed.v1', {
      reportType, requestedBy, sagaId
    });

    res.json({ success: true, reportId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Audit Log
app.post('/audit-log', async (req, res) => {
  const validated = parseOrRespond(auditLogSchema, req.body, res);
  if (!validated) return;

  const { userId, action, resource, resourceId, details, sagaId } = validated;

  try {
    const auditLog = await prisma.compliance_ComplianceAuditLog.create({
      data: {
        id: makeId(getModelPrefix('Compliance_ComplianceAuditLog')),
        userId,
        action,
        resource,
        details: details ? (JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue) : undefined
      }
    });

    await eventBus.publish('AuditLogRecorded.v1', {
      auditLogId: auditLog.id, userId, action, resource, sagaId
    });

    await eventBus.publish('AuditLogIndexed.v1', {
      userId, action, resource, sagaId
    });

    res.json({ success: true, auditLogId: auditLog.id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// AML Record (manual update)
app.post('/aml-record', async (req, res) => {
  const validated = parseOrRespond(amlRecordSchema, req.body, res);
  if (!validated) return;

  const { userId, sanctionsStatus, pepStatus, riskScore, flags, sagaId } = validated;

  try {
    const amlRecordId = await complianceRepository.upsertAmlRecord({
      userId,
      sanctionsStatus: sanctionsStatus ?? 'clear',
      pepStatus: pepStatus ?? false,
      riskScore: riskScore ?? 0,
      flags: flags ?? undefined
    });

    await eventBus.publish('AMLRecordUpdated.v1', {
      userId,
      amlRecordId,
      sagaId
    });

    res.status(201).json({ success: true, amlRecordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Subject Rights Request
app.post('/subject-rights-request', async (req, res) => {
  const validated = parseOrRespond(subjectRightsRequestSchema, req.body, res);
  if (!validated) return;

  const { userId, requestType, reason, payload, sagaId } = validated;

  try {
    const requestId = await complianceRepository.createSubjectRightsRequest({
      userId,
      requestType,
      reason,
      payload
    });

    await eventBus.publish('SubjectRightsRequestCreated.v1', {
      requestId,
      userId,
      requestType,
      sagaId
    });

    res.status(201).json({ success: true, requestId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Data Deletion Log
app.post('/data-deletion-log', async (req, res) => {
  const validated = parseOrRespond(dataDeletionLogSchema, req.body, res);
  if (!validated) return;

  const { userId, dataType, recordsDeleted, requestedBy, reason, sagaId } = validated;

  try {
    const logId = await complianceRepository.createDataDeletionLog({
      userId,
      dataType,
      recordsDeleted,
      requestedBy,
      reason
    });

    await eventBus.publish('DataDeletionLogged.v1', {
      logId,
      userId,
      dataType,
      recordsDeleted,
      sagaId
    });

    res.status(201).json({ success: true, logId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Data Retention Policy
app.post('/data-retention-policy', async (req, res) => {
  const validated = parseOrRespond(dataRetentionPolicySchema, req.body, res);
  if (!validated) return;

  const { dataType, retentionPeriod, legalBasis, applicableLaw, autoDelete, nextReviewDate, sagaId } = validated;

  try {
    const policyId = await complianceRepository.upsertDataRetentionPolicy({
      dataType,
      retentionPeriod,
      legalBasis,
      applicableLaw,
      autoDelete,
      nextReviewDate
    });

    await eventBus.publish('DataRetentionPolicyUpdated.v1', {
      policyId,
      dataType,
      sagaId
    });

    res.status(201).json({ success: true, policyId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Data Processing Record
app.post('/data-processing-record', async (req, res) => {
  const validated = parseOrRespond(dataProcessingRecordSchema, req.body, res);
  if (!validated) return;

  const { purpose, categories, recipients, retentionPeriod, securityMeasures, sagaId } = validated;

  try {
    const recordId = await complianceRepository.createDataProcessingRecord({
      purpose,
      categories,
      recipients,
      retentionPeriod,
      securityMeasures
    });

    await eventBus.publish('DataProcessingRecordCreated.v1', {
      recordId,
      purpose,
      sagaId
    });

    res.status(201).json({ success: true, recordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Privacy Impact Assessment
app.post('/privacy-impact-assessment', async (req, res) => {
  const validated = parseOrRespond(privacyImpactAssessmentSchema, req.body, res);
  if (!validated) return;

  const { projectName, assessor, riskLevel, findings, recommendations, status, sagaId } = validated;

  try {
    const assessmentId = await complianceRepository.createPrivacyImpactAssessment({
      projectName,
      assessor,
      riskLevel,
      findings,
      recommendations,
      status
    });

    await eventBus.publish('PrivacyImpactAssessmentCreated.v1', {
      assessmentId,
      projectName,
      riskLevel,
      sagaId
    });

    res.status(201).json({ success: true, assessmentId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// TCRA Record
app.post('/tcra-record', async (req, res) => {
  const validated = parseOrRespond(tcraRecordSchema, req.body, res);
  if (!validated) return;

  const { userId, licenseNumber, status, registrationAt, expiryDate, lastAuditAt, auditFindings, sagaId } = validated;

  try {
    const recordId = await complianceRepository.upsertTcraRecord({
      userId,
      licenseNumber,
      status,
      registrationAt,
      expiryDate,
      lastAuditAt,
      auditFindings
    });

    await eventBus.publish('TCRARecordUpdated.v1', {
      userId,
      recordId,
      sagaId
    });

    res.status(201).json({ success: true, recordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// TRA Record
app.post('/tra-record', async (req, res) => {
  const validated = parseOrRespond(traRecordSchema, req.body, res);
  if (!validated) return;

  const { userId, tin, vrn, taxComplianceStatus, lastFiscalCheck, efdStatus, sagaId } = validated;

  try {
    const recordId = await complianceRepository.upsertTraRecord({
      userId,
      tin,
      vrn,
      taxComplianceStatus,
      lastFiscalCheck,
      efdStatus
    });

    await eventBus.publish('TRARecordUpdated.v1', {
      userId,
      recordId,
      sagaId
    });

    res.status(201).json({ success: true, recordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Market Record
app.post('/market-record', async (req, res) => {
  const validated = parseOrRespond(marketRecordSchema, req.body, res);
  if (!validated) return;

  const { sellerId, ethicalScore, qualityStatus, certifications, lastAuditAt, sagaId } = validated;

  try {
    const recordId = await complianceRepository.upsertMarketRecord({
      sellerId,
      ethicalScore,
      qualityStatus,
      certifications,
      lastAuditAt
    });

    await eventBus.publish('MarketComplianceRecordUpdated.v1', {
      sellerId,
      recordId,
      sagaId
    });

    res.status(201).json({ success: true, recordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Status Endpoint
app.get('/kyc-status/:userId', async (req, res) => {
  const validated = parseOrRespond(kycStatusParamSchema, req.params, res);
  if (!validated) return;

  const { userId } = validated;

  try {
    const record = await prisma.compliance_KYCRecord.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'KYC record not found' });
    }

    const tierMap = {
      pending: 0,
      submitted: 1,
      under_review: 1,
      approved: 2,
      rejected: 0,
      expired: 0
    };

    res.json({
      success: true,
      data: {
        userId: record.userId,
        kycTier: tierMap[record.verificationStatus],
        verificationStatus: record.verificationStatus,
        riskLevel: record.riskLevel,
        submittedAt: record.submittedAt,
        verifiedAt: record.verifiedAt,
        expiryDate: record.expiryDate
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

return app;
};

const PORT = process.env.PORT || 3013;
if (require.main === module) {
  const prisma = createPrismaClient();
  const app = createApp(prisma, eventBus);
  app.listen(PORT, () => console.log(`Compliance Service (KYC only) running on port ${PORT}`));
}

export default createApp(createPrismaClient(), eventBus);
