import { PrismaClient } from '@prisma/client';

import { createPrismaClient } from '../../../../../shared/database/prisma-client';
import { PiiEncryptionService } from '../../../../../shared/encryption/pii-encryption.service';
import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../../domain/governance.types';

type SyncMismatchRow = {
  id: string;
  authEmail: string | null;
  userEmail: string | null;
  authPublicCode: string | null;
  userPublicCode: string | null;
};

export class AuthUserSyncInspector implements GovernanceInspector {
  constructor(
    public readonly gateId: string,
    private readonly prismaFactory: () => PrismaClient = () => createPrismaClient()
  ) {}

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const prisma = this.prismaFactory();
    const piiService = process.env.PII_ENCRYPTION_KEY ? new PiiEncryptionService() : null;

    try {
      const sampleMismatches = await prisma.$queryRawUnsafe<SyncMismatchRow[]>(`
        SELECT
          a.id AS id,
          a.email AS "authEmail",
          u.email AS "userEmail",
          a."publicCode" AS "authPublicCode",
          u."publicCode" AS "userPublicCode"
        FROM auth_users a
        LEFT JOIN users u ON u.id = a.id
        WHERE u.id IS NULL
           OR COALESCE(a.email, '') <> COALESCE(u.email, '')
           OR COALESCE(a."publicCode", '') <> COALESCE(u."publicCode", '')
        ORDER BY a.id
        LIMIT 200
      `);

      const normalizedMismatches = sampleMismatches.filter((row) => {
        const userEmail = this.normalizeUserEmail(row.userEmail, piiService);
        return (
          row.authEmail !== userEmail ||
          row.authPublicCode !== row.userPublicCode ||
          row.authEmail === null ||
          row.userEmail === null
        );
      });

      const missingUserRowsCount = sampleMismatches.filter(row => row.userEmail === null && row.authEmail !== null).length;
      const emailMismatchCount = normalizedMismatches.filter(row => {
        const userEmail = this.normalizeUserEmail(row.userEmail, piiService);
        return row.authEmail !== null && row.userEmail !== null && row.authEmail !== userEmail;
      }).length;
      const codeMismatchCount = normalizedMismatches.filter(row => {
        return row.authPublicCode !== null && row.userPublicCode !== null && row.authPublicCode !== row.userPublicCode;
      }).length;
      const totalMismatchCount = normalizedMismatches.length;
      const status = totalMismatchCount === 0 ? 'PASS' : 'FAIL';
      const finishedAt = new Date().toISOString();

      const evidence: EvidenceArtifact[] = [
        { label: 'missingUserRowsCount', type: 'json', value: JSON.stringify({ count: missingUserRowsCount }, null, 2) },
        { label: 'emailMismatchCount', type: 'json', value: JSON.stringify({ count: emailMismatchCount }, null, 2) },
        { label: 'codeMismatchCount', type: 'json', value: JSON.stringify({ count: codeMismatchCount }, null, 2) },
        { label: 'sampleMismatches', type: 'json', value: JSON.stringify(normalizedMismatches.slice(0, 10), null, 2) }
      ];

      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status,
        summary: status === 'PASS'
          ? 'auth_users and users records are synchronized'
          : `Detected ${totalMismatchCount} auth/user sync mismatches`,
        evidence,
        startedAt,
        finishedAt,
        durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      };
    } catch (error) {
      const finishedAt = new Date().toISOString();
      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status: 'FAIL',
        summary: error instanceof Error ? error.message : 'Unknown auth sync inspection error',
        evidence: [{ label: 'targetBaseUrl', type: 'url', value: context.targetBaseUrl }],
        startedAt,
        finishedAt,
        durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      };
    } finally {
      await prisma.$disconnect().catch(() => undefined);
    }
  }

  private normalizeUserEmail(value: string | null, piiService: PiiEncryptionService | null): string | null {
    if (!value) {
      return value;
    }

    if (!piiService) {
      return value;
    }

    try {
      return piiService.decrypt(value);
    } catch {
      return value;
    }
  }
}
