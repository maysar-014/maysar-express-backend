import path from 'path';

import { GovernanceController } from './api/controllers/governance.controller';
import { GovernanceRunner } from './application/governance-runner';
import { ConstitutionDocument } from './domain/governance.types';
import { loadConstitution } from './infrastructure/constitution-loader';
import { GovernanceReportStore } from './infrastructure/governance-report-store';
import { AuthUserSyncInspector } from './infrastructure/inspectors/auth-user-sync-inspector';
import { FilesystemRoundtripInspector } from './infrastructure/filesystem-roundtrip-inspector';
import { IndexRoundtripInspector } from './infrastructure/inspectors/index-roundtrip-inspector';
import { HttpEndpointInspector } from './infrastructure/inspectors/http-endpoint-inspector';
import { Phase2LiveInspector } from './infrastructure/inspectors/phase-2-live-inspector';
import { Phase3LiveInspector } from './infrastructure/inspectors/phase-3-live-inspector';
import { Phase4LiveInspector } from './infrastructure/inspectors/phase-4-live-inspector';
import { NodeScriptReportInspector } from './infrastructure/inspectors/node-script-report-inspector';
import { ServiceReadinessInspector } from './infrastructure/inspectors/service-readiness-inspector';
import { WalletLedgerInspector } from './infrastructure/inspectors/wallet-ledger-inspector';

export interface GovernanceRuntimeConfig {
  targetBaseUrl: string;
  rootDir: string;
  reportDir: string;
  constitutionPath: string;
}

export interface GovernanceServiceEnvironment {
  constitution: ConstitutionDocument;
  reportStore: GovernanceReportStore;
  runner: GovernanceRunner;
  controller: GovernanceController;
  contextFactory: () => GovernanceRuntimeConfig;
  config: GovernanceRuntimeConfig;
}

function resolveProjectPath(rootDir: string, ...segments: string[]): string {
  return path.resolve(rootDir, ...segments);
}

function buildDefaultReadinessTargets(targetBaseUrl: string): Array<{ name: string; url: string; expectedStatus?: number }> {
  const normalizedBaseUrl = targetBaseUrl.replace(/\/$/, '');
  return [
    { name: 'auth-service', url: `${normalizedBaseUrl}/api/auth/health/ready`, expectedStatus: 200 },
    { name: 'user-service', url: `${normalizedBaseUrl}/api/user/health/ready`, expectedStatus: 200 },
    { name: 'order-service', url: `${normalizedBaseUrl}/api/order/health/ready`, expectedStatus: 200 },
    { name: 'payment-service', url: `${normalizedBaseUrl}/api/payment/health/ready`, expectedStatus: 200 },
    { name: 'wallet-service', url: `${normalizedBaseUrl}/api/wallet/health/ready`, expectedStatus: 200 },
    { name: 'inventory-service', url: `${normalizedBaseUrl}/api/inventory/health/ready`, expectedStatus: 200 },
    { name: 'logistics-service', url: `${normalizedBaseUrl}/api/logistics/health/ready`, expectedStatus: 200 },
    { name: 'notification-service', url: `${normalizedBaseUrl}/api/notification/health/ready`, expectedStatus: 200 },
    { name: 'commission-service', url: `${normalizedBaseUrl}/api/commission/health/ready`, expectedStatus: 200 },
    { name: 'checkout-service', url: `${normalizedBaseUrl}/api/checkout/health/ready`, expectedStatus: 200 },
    { name: 'kyc-service', url: `${normalizedBaseUrl}/api/kyc/health/ready`, expectedStatus: 200 },
    { name: 'business-registry-service', url: `${normalizedBaseUrl}/api/business-registry/health/ready`, expectedStatus: 200 },
    { name: 'maps-service', url: `${normalizedBaseUrl}/api/maps/health/ready`, expectedStatus: 200 },
    { name: 'catalog-service', url: `${normalizedBaseUrl}/api/catalog/health/ready`, expectedStatus: 200 }
  ];
}

function readTargetsFromEnv(targetBaseUrl: string): Array<{ name: string; url: string; expectedStatus?: number }> | undefined {
  const rawTargets = process.env.GOVERNANCE_SERVICE_READINESS_TARGETS_JSON;
  if (!rawTargets) {
    return buildDefaultReadinessTargets(targetBaseUrl);
  }

  try {
    const parsed = JSON.parse(rawTargets) as Array<{ name: string; url: string; expectedStatus?: number }>;
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.filter(target => Boolean(target?.name) && Boolean(target?.url))
      : buildDefaultReadinessTargets(targetBaseUrl);
  } catch {
    return buildDefaultReadinessTargets(targetBaseUrl);
  }
}

export function createGovernanceServiceEnvironment(overrides?: Partial<GovernanceRuntimeConfig>): GovernanceServiceEnvironment {
  const rootDir = overrides?.rootDir ?? process.cwd();
  const config: GovernanceRuntimeConfig = {
    targetBaseUrl: overrides?.targetBaseUrl ?? process.env.GOVERNANCE_TARGET_BASE_URL ?? 'http://localhost:3000',
    rootDir,
    reportDir: overrides?.reportDir ?? process.env.GOVERNANCE_REPORT_DIR ?? resolveProjectPath(rootDir, 'reports', 'governance'),
    constitutionPath:
      overrides?.constitutionPath ??
      process.env.GOVERNANCE_CONSTITUTION_PATH ??
      resolveProjectPath(rootDir, 'services', 'governance-service', 'constitutions', 'phase-1.json')
  };

  const constitution = loadConstitution(config.constitutionPath);
  const reportStore = new GovernanceReportStore(config.reportDir);
  const readinessTargets = readTargetsFromEnv(config.targetBaseUrl);

  const inspectors = [
    new HttpEndpointInspector('OPS1.1'),
    new HttpEndpointInspector('OPS1.2'),
    new NodeScriptReportInspector('R1.1'),
    new NodeScriptReportInspector('R1.2'),
    new FilesystemRoundtripInspector('OPS1.3'),
    new IndexRoundtripInspector('OPS1.4'),
    new AuthUserSyncInspector('D1.1'),
    new WalletLedgerInspector('FIN1.1'),
    new ServiceReadinessInspector('OPS1.5'),
    new Phase2LiveInspector('F2.1'),
    new Phase2LiveInspector('F2.2'),
    new Phase2LiveInspector('F2.3'),
    new Phase2LiveInspector('F2.4'),
    new Phase2LiveInspector('F2.5'),
    new Phase2LiveInspector('F2.6'),
    new Phase2LiveInspector('F2.7'),
    new Phase2LiveInspector('F2.8'),
    new Phase3LiveInspector('F3.1'),
    new Phase3LiveInspector('F3.2'),
    new Phase3LiveInspector('F3.7'),
    new Phase3LiveInspector('F3.8'),
    new Phase3LiveInspector('F3.9'),
    new Phase3LiveInspector('F3.10'),
    new Phase3LiveInspector('D3.1'),
    new Phase3LiveInspector('D3.2'),
    new Phase3LiveInspector('D3.3'),
    new Phase3LiveInspector('D3.4'),
    new Phase4LiveInspector('F4.2'),
    new Phase4LiveInspector('F4.3'),
    new Phase4LiveInspector('F4.5'),
    new Phase4LiveInspector('OPS4.1'),
    new Phase4LiveInspector('OPS4.2'),
    new Phase4LiveInspector('D4.2')
  ];

  const targetConstitution: ConstitutionDocument = {
    ...constitution,
    gates: constitution.gates.map(gate =>
      gate.id === 'OPS1.5'
        ? {
            ...gate,
            targets: gate.targets ?? readinessTargets
          }
        : gate
    )
  };

  const runner = new GovernanceRunner(
    targetConstitution,
    inspectors,
    reportStore
  );

  const controller = new GovernanceController(runner, reportStore, targetConstitution, () => config);

  return {
    constitution: targetConstitution,
    reportStore,
    runner,
    controller,
    contextFactory: () => config,
    config
  };
}
