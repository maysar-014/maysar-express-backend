import type { ComplianceService } from '../shared-contracts/compliance-service-contracts';

describe('compliance-service contracts', () => {
  it('supports kyc command and event payloads', () => {
    const command: ComplianceService.Commands.CheckKYCCompliance = {
      entityId: 'entity-1',
      entityType: 'seller',
      context: { region: 'TZ' }
    };
    const event: ComplianceService.Events.KYCCheckCompleted = {
      checkId: 'check-1',
      entityId: 'entity-1',
      entityType: 'seller',
      passed: false,
      issues: ['missing-id'],
      checkedAt: new Date('2026-03-09T00:00:00.000Z')
    };

    expect(command.entityType).toBe('seller');
    expect(event.issues).toContain('missing-id');
  });
});
