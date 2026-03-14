import { ConfirmProductMatchUseCase } from './confirm-product-match.use-case';

describe('ConfirmProductMatchUseCase', () => {
  it('throws when confirmation is not found', async () => {
    const useCase = new ConfirmProductMatchUseCase(
      { findById: jest.fn().mockResolvedValue(null), updateStatus: jest.fn() } as never,
      { findById: jest.fn(), save: jest.fn() } as never
    );

    await expect(useCase.execute('c1', { choice: 'confirm' } as any)).rejects.toThrow(
      'Confirmation not found'
    );
  });

  it('throws when confirmation is not pending', async () => {
    const useCase = new ConfirmProductMatchUseCase(
      {
        findById: jest.fn().mockResolvedValue({
          status: 'CONFIRMED',
          expiresAt: new Date(Date.now() + 60_000).toISOString()
        }),
        updateStatus: jest.fn()
      } as never,
      { findById: jest.fn(), save: jest.fn() } as never
    );

    await expect(useCase.execute('c1', { choice: 'confirm' } as any)).rejects.toThrow(
      'Confirmation is not pending (current status: CONFIRMED)'
    );
  });

  it('throws when confirmation is expired', async () => {
    const useCase = new ConfirmProductMatchUseCase(
      {
        findById: jest.fn().mockResolvedValue({
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 60_000).toISOString()
        }),
        updateStatus: jest.fn()
      } as never,
      { findById: jest.fn(), save: jest.fn() } as never
    );

    await expect(useCase.execute('c1', { choice: 'reject' } as any)).rejects.toThrow(
      'Confirmation has expired'
    );
  });

  it('confirms a match, updates audit and returns merged response', async () => {
    const confirmationRepository = {
      findById: jest.fn().mockResolvedValue({
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        auditId: 'a1'
      }),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const audit = { metadata: { source: 'initial' } } as any;
    const auditRepository = {
      findById: jest.fn().mockResolvedValue(audit),
      save: jest.fn().mockResolvedValue(undefined)
    };
    const useCase = new ConfirmProductMatchUseCase(
      confirmationRepository as never,
      auditRepository as never
    );

    const result = await useCase.execute('c1', {
      choice: 'confirm',
      selectedProductId: 'product-9'
    });

    expect(confirmationRepository.updateStatus).toHaveBeenCalledWith('c1', 'CONFIRMED', 'product-9');
    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'SELLER_CONFIRMED',
        decidedBy: 'SELLER',
        matchedProductId: 'product-9',
        metadata: expect.objectContaining({
          source: 'initial',
          confirmationId: 'c1',
          sellerChoice: 'product-9',
          confirmedAt: expect.any(String)
        })
      })
    );
    expect(result).toEqual({
      success: true,
      actionTaken: 'merged',
      finalProductId: 'product-9'
    });
  });

  it('rejects a match and returns created_new response even when audit missing', async () => {
    const confirmationRepository = {
      findById: jest.fn().mockResolvedValue({
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        auditId: 'a1'
      }),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const auditRepository = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn()
    };
    const useCase = new ConfirmProductMatchUseCase(
      confirmationRepository as never,
      auditRepository as never
    );

    const result = await useCase.execute('c1', {
      choice: 'reject'
    });

    expect(confirmationRepository.updateStatus).toHaveBeenCalledWith('c1', 'REJECTED', 'new');
    expect(auditRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      actionTaken: 'created_new',
      finalProductId: ''
    });
  });
});
