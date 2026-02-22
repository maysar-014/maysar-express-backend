import { InitiatePayoutUseCase, InitiatePayoutDTO } from '../initiate-payout.use-case';
import { IPayoutRepository } from '../../../domain/ports/payout.repository.port';
import { PayoutPolicy } from '../../../domain/policies/payout.policy';
import { Payout, PayoutStatus, PayoutMethod } from '../../../domain/entities/payout.entity';

describe('InitiatePayoutUseCase', () => {
  let useCase: InitiatePayoutUseCase;
  let mockPayoutRepository: jest.Mocked<IPayoutRepository>;
  let mockPayoutPolicy: jest.Mocked<PayoutPolicy>;
  let mockPayoutSaga: any;

  beforeEach(() => {
    mockPayoutRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockPayoutPolicy = {
      canPayout: jest.fn(),
      isEligibleRole: jest.fn(),
      calculatePayoutFee: jest.fn(),
      getMinimumPayoutAmount: jest.fn(),
      getMaximumPayoutAmount: jest.fn(),
    } as any;

    mockPayoutSaga = {
      start: jest.fn(),
    };

    useCase = new InitiatePayoutUseCase(
      mockPayoutRepository,
      mockPayoutPolicy,
      mockPayoutSaga
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validBankTransferDTO: InitiatePayoutDTO = {
      userId: 'user-1',
      userRole: 'seller',
      amount: 100000,
      currency: 'TZS',
      method: PayoutMethod.BANK_TRANSFER,
      bankDetails: {
        bankName: 'CRDB Bank',
        bankCode: '01',
        accountNumber: '1234567890',
        accountName: 'John Doe',
      },
      availableBalance: 150000,
      userStatus: 'active',
    };

    it('should initiate payout successfully with full eligibility check', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      const result = await useCase.execute(validBankTransferDTO);

      expect(result.success).toBe(true);
      expect(result.status).toBe(PayoutStatus.PENDING);
      expect(result.payoutId).toBeDefined();
      expect(result.amount).toBe(100000);
      expect(result.fee).toBe(1000);
      expect(result.netAmount).toBe(99000);
    });

    it('should call policy canPayout with correct parameters', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      await useCase.execute(validBankTransferDTO);

      expect(mockPayoutPolicy.canPayout).toHaveBeenCalledWith(
        150000,
        100000,
        'seller',
        undefined,
        'active'
      );
    });

    it('should reject payout when eligibility check fails', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: false,
        reasons: ['Insufficient balance', 'Below minimum amount'],
      });

      const result = await useCase.execute(validBankTransferDTO);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.reasons).toHaveLength(2);
      expect(mockPayoutRepository.save).not.toHaveBeenCalled();
    });

    it('should perform minimal role check when balance not provided', async () => {
      const dtoWithoutBalance = { ...validBankTransferDTO };
      delete dtoWithoutBalance.availableBalance;

      mockPayoutPolicy.isEligibleRole.mockReturnValue(true);
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      const result = await useCase.execute(dtoWithoutBalance);

      expect(result.success).toBe(true);
      expect(mockPayoutPolicy.isEligibleRole).toHaveBeenCalledWith('seller');
      expect(mockPayoutPolicy.canPayout).not.toHaveBeenCalled();
    });

    it('should reject payout for ineligible role', async () => {
      const dtoWithoutBalance = { ...validBankTransferDTO };
      delete dtoWithoutBalance.availableBalance;

      mockPayoutPolicy.isEligibleRole.mockReturnValue(false);

      const result = await useCase.execute(dtoWithoutBalance);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.message).toContain('not eligible for payouts');
    });

    it('should calculate payout fee correctly', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1500);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      const result = await useCase.execute(validBankTransferDTO);

      expect(mockPayoutPolicy.calculatePayoutFee).toHaveBeenCalledWith(
        100000,
        PayoutMethod.BANK_TRANSFER
      );
      expect(result.fee).toBe(1500);
      expect(result.netAmount).toBe(98500);
    });

    it('should save payout to repository', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      await useCase.execute(validBankTransferDTO);

      expect(mockPayoutRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          amount: 100000,
          status: PayoutStatus.PENDING,
        })
      );
    });

    it('should start payout saga', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      await useCase.execute(validBankTransferDTO);

      expect(mockPayoutSaga.start).toHaveBeenCalledWith(
        expect.objectContaining({
          payoutId: expect.any(String),
          sellerId: 'user-1',
          amount: 100000,
          currency: 'TZS',
          method: PayoutMethod.BANK_TRANSFER,
        })
      );
    });

    it('should handle mobile money payout', async () => {
      const mobileMoneyDTO: InitiatePayoutDTO = {
        userId: 'user-1',
        userRole: 'seller',
        amount: 50000,
        currency: 'TZS',
        method: PayoutMethod.MOBILE_MONEY,
        mobileMoneyDetails: {
          provider: 'M-Pesa',
          phoneNumber: '+255712345678',
          accountName: 'John Doe',
        },
        availableBalance: 100000,
        userStatus: 'active',
      };

      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(750);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      const result = await useCase.execute(mobileMoneyDTO);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(50000);
      expect(result.fee).toBe(750);
    });

    it('should handle wallet payout', async () => {
      const walletDTO: InitiatePayoutDTO = {
        userId: 'user-1',
        userRole: 'seller',
        amount: 25000,
        currency: 'TZS',
        method: PayoutMethod.WALLET,
        availableBalance: 50000,
        userStatus: 'active',
      };

      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(0);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      const result = await useCase.execute(walletDTO);

      expect(result.success).toBe(true);
      expect(result.fee).toBe(0);
      expect(result.netAmount).toBe(25000);
    });

    it('should reject invalid payout details', async () => {
      const invalidDTO: InitiatePayoutDTO = {
        userId: 'user-1',
        userRole: 'seller',
        amount: 100000,
        currency: 'TZS',
        method: PayoutMethod.BANK_TRANSFER,
        bankDetails: {
          bankName: '',
          bankCode: '',
          accountNumber: 'invalid',
          accountName: '',
        },
        availableBalance: 150000,
      };

      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);

      const result = await useCase.execute(invalidDTO);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.message).toContain('Invalid payout details');
    });

    it('should handle repository errors', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute(validBankTransferDTO)).rejects.toThrow('Database error');
    });

    it('should handle saga start errors', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockRejectedValue(new Error('Saga initialization failed'));

      await expect(useCase.execute(validBankTransferDTO)).rejects.toThrow(
        'Saga initialization failed'
      );
    });

    it('should generate unique payout IDs', async () => {
      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      const result1 = await useCase.execute(validBankTransferDTO);
      const result2 = await useCase.execute(validBankTransferDTO);

      expect(result1.payoutId).toBeDefined();
      expect(result2.payoutId).toBeDefined();
      expect(result1.payoutId).not.toBe(result2.payoutId);
    });

    it('should include lastPayoutDate in eligibility check', async () => {
      const lastPayoutDate = new Date('2024-01-01');
      const dtoWithLastPayout = {
        ...validBankTransferDTO,
        lastPayoutDate,
      };

      mockPayoutPolicy.canPayout.mockReturnValue({
        canPayout: true,
        reasons: [],
      });
      mockPayoutPolicy.calculatePayoutFee.mockReturnValue(1000);
      mockPayoutRepository.save.mockResolvedValue(undefined);
      mockPayoutSaga.start.mockResolvedValue(undefined);

      await useCase.execute(dtoWithLastPayout);

      expect(mockPayoutPolicy.canPayout).toHaveBeenCalledWith(
        150000,
        100000,
        'seller',
        lastPayoutDate,
        'active'
      );
    });
  });
});
