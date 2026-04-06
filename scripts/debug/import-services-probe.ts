import 'dotenv/config';

type ImportedModule = {
  name?: string;
  initialize?: () => void | Promise<void>;
};

const serviceImports: ReadonlyArray<readonly [string, string]> = [
  ['analytics-service', '../../services/analytics-service'],
  ['auth-service', '../../services/auth-service'],
  ['business-registry-service', '../../services/business-registry-service'],
  ['catalog-service', '../../services/catalog-service'],
  ['checkout-service', '../../services/checkout-service'],
  ['commission-service', '../../services/commission-service'],
  ['community-service', '../../services/community-service'],
  ['compliance-service', '../../services/compliance-service'],
  ['enabler-service', '../../services/enabler-service'],
  ['inventory-service', '../../services/inventory-service'],
  ['logistics-service', '../../services/logistics-service'],
  ['maps-service', '../../services/maps-service'],
  ['notification-service', '../../services/notification-service'],
  ['order-service', '../../services/order-service'],
  ['payment-service', '../../services/payment-service'],
  ['payout-service', '../../services/payout-service'],
  ['production-service', '../../services/production-service'],
  ['support-service', '../../services/support-service'],
  ['training-service', '../../services/training-service'],
  ['user-service', '../../services/user-service'],
  ['wallet-service', '../../services/wallet-service']
];

function timeout(label: string, ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out while waiting for ${label} after ${ms}ms`)), ms);
  });
}

async function importWithTimeout(label: string, specifier: string): Promise<ImportedModule> {
  console.log(`[probe] importing ${label}`);
  const startedAt = Date.now();
  const imported = await Promise.race([
    import(specifier) as Promise<ImportedModule>,
    timeout(label, 15000)
  ]);
  console.log(`[probe] imported ${label} in ${Date.now() - startedAt}ms`);
  return imported;
}

async function main() {
  console.log('[probe] starting service import probe');
  for (const [label, specifier] of serviceImports) {
    await importWithTimeout(label, specifier);
  }
  console.log('[probe] all service imports completed');
}

main().catch((error) => {
  console.error('[probe] failed', error);
  process.exit(1);
});
