import { PrismaClient } from '@prisma/client';

import { createPrismaClient } from '../../../../../shared/database/prisma-client';
import {
  ConstitutionGateDefinition,
  EvidenceArtifact,
  GateResult,
  GovernanceExecutionContext,
  GovernanceInspector
} from '../../domain/governance.types';

type LedgerCountRow = {
  count: string;
};

type LedgerMismatchRow = {
  walletId: string;
  transactionId: string;
  previousAfter: string | null;
  balanceBefore: string;
  balanceAfter: string;
};

export class WalletLedgerInspector implements GovernanceInspector {
  constructor(
    public readonly gateId: string,
    private readonly prismaFactory: () => PrismaClient = () => createPrismaClient()
  ) {}

  async inspect(context: GovernanceExecutionContext, definition: ConstitutionGateDefinition): Promise<GateResult> {
    const startedAt = new Date().toISOString();
    const prisma = this.prismaFactory();

    try {
      const nonTzsWallets = await prisma.$queryRawUnsafe<LedgerCountRow[]>(`
        SELECT COUNT(*)::text AS count
        FROM wallets
        WHERE "currency" <> 'TZS'
      `);

      const negativeWallets = await prisma.$queryRawUnsafe<LedgerCountRow[]>(`
        SELECT COUNT(*)::text AS count
        FROM wallets
        WHERE "balance" < 0
      `);

      const ledgerBreaks = await prisma.$queryRawUnsafe<LedgerMismatchRow[]>(`
        WITH ordered AS (
          SELECT
            "walletId" AS "walletId",
            id AS "transactionId",
            "balanceBefore" AS "balanceBefore",
            "balanceAfter" AS "balanceAfter",
            LAG("balanceAfter") OVER (
              PARTITION BY "walletId"
              ORDER BY "createdAt" ASC, id ASC
            ) AS "previousAfter"
          FROM wallet_transactions
        )
        SELECT *
        FROM ordered
        WHERE "previousAfter" IS NOT NULL
          AND "previousAfter" <> "balanceBefore"
        ORDER BY "walletId", "transactionId"
        LIMIT 10
      `);

      const nonTzsCount = Number(nonTzsWallets[0]?.count ?? '0');
      const negativeCount = Number(negativeWallets[0]?.count ?? '0');
      const ledgerBreakCount = ledgerBreaks.length;
      const status = nonTzsCount === 0 && negativeCount === 0 && ledgerBreakCount === 0 ? 'PASS' : 'FAIL';
      const finishedAt = new Date().toISOString();

      const evidence: EvidenceArtifact[] = [
        { label: 'nonTzsWallets', type: 'json', value: JSON.stringify(nonTzsWallets[0] ?? { count: 0 }, null, 2) },
        { label: 'negativeWallets', type: 'json', value: JSON.stringify(negativeWallets[0] ?? { count: 0 }, null, 2) },
        { label: 'ledgerBreaks', type: 'json', value: JSON.stringify(ledgerBreaks, null, 2) }
      ];

      return {
        gateId: definition.id,
        title: definition.title,
        category: definition.category,
        severity: definition.severity,
        status,
        summary: status === 'PASS'
          ? 'wallet currency and ledger continuity checks passed'
          : `Detected ${nonTzsCount} non-TZS wallets, ${negativeCount} negative wallets, and ${ledgerBreakCount} ledger breaks`,
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
        summary: error instanceof Error ? error.message : 'Unknown wallet inspection error',
        evidence: [{ label: 'targetBaseUrl', type: 'url', value: context.targetBaseUrl }],
        startedAt,
        finishedAt,
        durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      };
    } finally {
      await prisma.$disconnect().catch(() => undefined);
    }
  }
}
