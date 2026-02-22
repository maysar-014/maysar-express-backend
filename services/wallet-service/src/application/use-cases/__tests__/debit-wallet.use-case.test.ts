import { DebitWalletUseCase } from '../debit-wallet.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('DebitWalletUseCase', () => {
    let useCase: DebitWalletUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new DebitWalletUseCase(mockRepository, mockEventBus);
    });

    it('should debit wallet successfully', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 100 });
        const result = await useCase.execute({ walletId: 'wallet-1', amount: 30 });
        expect(result.newBalance).toBe(70);
        expect(mockRepository.update).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('WalletDebited.v1', expect.any(Object));
    });

    it('should fail if insufficient balance', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 20 });
        await expect(useCase.execute({ walletId: 'wallet-1', amount: 50 }))
            .rejects.toThrow('Insufficient balance');
    });

    it('should reject negative amount', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 100 });
        await expect(useCase.execute({ walletId: 'wallet-1', amount: -10 }))
            .rejects.toThrow('Invalid amount');
    });

    it('should allow debit to zero balance', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 50 });
        const result = await useCase.execute({ walletId: 'wallet-1', amount: 50 });
        expect(result.newBalance).toBe(0);
    });

    it('should fail if wallet not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute({ walletId: 'wallet-1', amount: 30 }))
            .rejects.toThrow('Wallet not found');
    });

    it('should handle repository failure gracefully', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 100 });
        mockRepository.update.mockRejectedValue(new Error('Connection timeout'));
        await expect(useCase.execute({ walletId: 'wallet-1', amount: 30 }))
            .rejects.toThrow('Connection timeout');
    });
});
