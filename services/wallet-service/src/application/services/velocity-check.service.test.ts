import { VelocityDecision, VelocityRiskLevel } from '../../domain/policies/velocity-check.policy';
import { Money } from '../../domain/value-objects/money.value-object';
import { VelocityCheckService } from './velocity-check.service';

describe('VelocityCheckService', () => {
  it('loads recent transactions and delegates to velocity policy', async () => {
    const transactions = [{ id: 'tx-1', amount: 1000, createdAt: new Date() }];
    const repository = {
      findByUserId: jest.fn().mockResolvedValue(transactions)
    };
    const policy = {
      checkVelocity: jest.fn().mockReturnValue({
        decision: VelocityDecision.ALLOW,
        riskLevel: VelocityRiskLevel.LOW,
        riskScore: 5,
        reason: ''
      })
    };
    const service = new VelocityCheckService(policy as never, repository as never);
    const amount = Money.fromMinor(1500, 'TZS');

    const result = await service.checkVelocity('user-1', amount);

    expect(repository.findByUserId).toHaveBeenCalledWith('user-1', {
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    expect(policy.checkVelocity).toHaveBeenCalledWith(transactions, amount);
    expect(result.decision).toBe(VelocityDecision.ALLOW);
  });
});
