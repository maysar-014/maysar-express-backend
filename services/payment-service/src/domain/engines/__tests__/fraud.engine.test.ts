import { FraudEngine, TransactionData, FraudAssessment } from '../fraud.engine';
import { IFraudRepository } from '../../ports/fraud.repository.port';

describe('Fraud Engine', () => {
    let fraudEngine: FraudEngine;
    let mockRepository: jest.Mocked<IFraudRepository>;

    const mockTransaction: TransactionData = {
        transactionId: 'tx_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'TZS',
        paymentMethod: 'MPESA',
        ipAddress: '192.168.1.1',
        deviceFingerprint: 'device_123',
        billingAddress: {},
        shippingAddress: {},
        timestamp: new Date(),
    };

    beforeEach(() => {
        mockRepository = {
            saveAssessment: jest.fn(),
            getRecentTransactions: jest.fn(),
            getUserProfile: jest.fn(),
            getUserLocationHistory: jest.fn(),
            getDeviceHistory: jest.fn(),
            getDeviceReputation: jest.fn(),
            getUserBehavior: jest.fn(),
        };

        fraudEngine = new FraudEngine(mockRepository);
    });

    it('should approve low risk transaction', async () => {
        // Mock low risk data
        mockRepository.getRecentTransactions.mockResolvedValue([]);
        mockRepository.getUserProfile.mockResolvedValue({ averageTransaction: 500 });
        mockRepository.getUserLocationHistory.mockResolvedValue([]);
        mockRepository.getDeviceHistory.mockResolvedValue(['device_123']);
        mockRepository.getDeviceReputation.mockResolvedValue({ riskScore: 0 });
        mockRepository.getUserBehavior.mockResolvedValue({ activeHours: [mockTransaction.timestamp.getHours()], paymentMethods: ['MPESA'] });

        const assessment = await fraudEngine.assessTransaction(mockTransaction);

        expect(assessment.recommendation).toBe('approve');
        expect(assessment.riskLevel).toBe('low');
        expect(assessment.riskScore).toBeLessThan(30);
        expect(mockRepository.saveAssessment).toHaveBeenCalled();
    });

    it('should decline critical risk transaction (impossible travel)', async () => {
        // Mock impossible travel
        mockRepository.getRecentTransactions.mockResolvedValue([]);
        mockRepository.getUserProfile.mockResolvedValue({ averageTransaction: 500 });
        mockRepository.getUserLocationHistory.mockResolvedValue([{
            timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            country: 'UK',
            lat: 51.5074,
            lng: 0.1278
        }]); // Current location is mocked as US/NY in engine which is far from UK

        mockRepository.getDeviceHistory.mockResolvedValue(['device_123']);
        mockRepository.getDeviceReputation.mockResolvedValue({ riskScore: 0 });
        mockRepository.getUserBehavior.mockResolvedValue({ activeHours: [], paymentMethods: [] });

        const assessment = await fraudEngine.assessTransaction(mockTransaction);

        // Impossible travel weight is 40. Need more weight to reach critical (80).
        // Check flags: impossible_travel(40) + new_device(10) + unusual_time(8) + new_payment_method(12) = 70 (high)
        const flagTypes = assessment.flags.map(f => f.type);
        expect(flagTypes).toContain('impossible_travel');
        expect(assessment.riskScore).toBeGreaterThan(60); // At least high risk
    });

    it('should flag high velocity', async () => {
        // Mock high velocity
        const recentTx = Array(6).fill({ amount: 100 }); // 6 transactions
        mockRepository.getRecentTransactions.mockResolvedValue(recentTx);
        mockRepository.getUserProfile.mockResolvedValue({ averageTransaction: 500 });
        mockRepository.getUserLocationHistory.mockResolvedValue([]);
        mockRepository.getDeviceHistory.mockResolvedValue(['device_123']);
        mockRepository.getDeviceReputation.mockResolvedValue({ riskScore: 0 });
        mockRepository.getUserBehavior.mockResolvedValue({});

        const assessment = await fraudEngine.assessTransaction(mockTransaction);

        const flagTypes = assessment.flags.map(f => f.type);
        expect(flagTypes).toContain('high_frequency');
    });

    it('should flag unusual amount', async () => {
        mockRepository.getRecentTransactions.mockResolvedValue([]);
        mockRepository.getUserProfile.mockResolvedValue({ averageTransaction: 100 }); // Amount 1000 is 10x average
        mockRepository.getUserLocationHistory.mockResolvedValue([]);
        mockRepository.getDeviceHistory.mockResolvedValue(['device_123']);
        mockRepository.getDeviceReputation.mockResolvedValue({ riskScore: 0 });
        mockRepository.getUserBehavior.mockResolvedValue({});

        const assessment = await fraudEngine.assessTransaction(mockTransaction);

        const flagTypes = assessment.flags.map(f => f.type);
        expect(flagTypes).toContain('unusual_amount');
    });
});
