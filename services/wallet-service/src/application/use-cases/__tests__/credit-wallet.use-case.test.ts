import { CreditWalletUseCase } from '../credit-wallet.use-case';

const mockRepository = { findById: jest.fn(), update: jest.fn() } as any;
const mockEventBus = { publish: jest.fn() } as any;

describe('CreditWalletUseCase', () => {
    let useCase: CreditWalletUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreditWalletUseCase(mockRepository, mockEventBus);
    });

    it('should credit wallet successfully', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 100 });
        const result = await useCase.execute({ walletId: 'wallet-1', amount: 50 });
        expect(result.newBalance).toBe(150);
        expect(mockRepository.update).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith('WalletCredited.v1', expect.any(Object));
    });

    it('should fail if wallet not found', async () => {
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute({ walletId: 'wallet-1', amount: 50 }))
            .rejects.toThrow('Wallet not found');
    });

    it('should reject negative amount', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 100 });
        await expect(useCase.execute({ walletId: 'wallet-1', amount: -10 }))
            .rejects.toThrow('Invalid amount');
    });

    it('should reject zero amount', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 100 });
        await expect(useCase.execute({ walletId: 'wallet-1', amount: 0 }))
            .rejects.toThrow('Invalid amount');
    });

    it('should handle large credit amounts', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 1000 });
        const result = await useCase.execute({ walletId: 'wallet-1', amount: 999999 });
        expect(result.newBalance).toBe(1000999);
    });

    it('should handle repository update failure', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'wallet-1', balance: 100 });
        mockRepository.update.mockRejectedValue(new Error('Database error'));
        await expect(useCase.execute({ walletId: 'wallet-1', amount: 50 }))
            .rejects.toThrow('Database error');
    });
});
