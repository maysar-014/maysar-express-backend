import { ResolveCODDisputeUseCase, ResolveCODDisputeRequest, CODDispute } from '../resolve-cod-dispute.use-case';

describe('ResolveCODDisputeUseCase', () => {
    let useCase: ResolveCODDisputeUseCase;
    let mockDisputeRepository: any;
    let mockEventPublisher: any;

    const mockDispute: CODDispute = {
        id: 'dispute-1',
        orderId: 'order-1',
        disputeType: 'NON_PAYMENT',
        raisedBy: 'seller-1',
        description: 'Buyer refused to pay',
        status: 'PENDING',
    };

    const validRequest: ResolveCODDisputeRequest = {
        disputeId: 'dispute-1',
        resolution: 'Buyer confirmed payment was made',
        decision: 'REFUND_COMMITMENT',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockDisputeRepository = {
            findById: jest.fn().mockResolvedValue({ ...mockDispute }),
            update: jest.fn(),
        };
        mockEventPublisher = { publish: jest.fn() };

        useCase = new ResolveCODDisputeUseCase(mockDisputeRepository, mockEventPublisher);
    });

    it('should resolve dispute successfully', async () => {
        await useCase.execute(validRequest);

        expect(mockDisputeRepository.update).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'RESOLVED',
                resolution: 'Buyer confirmed payment was made',
            })
        );
    });

    it('should fail when dispute not found', async () => {
        mockDisputeRepository.findById.mockResolvedValue(null);

        await expect(useCase.execute(validRequest)).rejects.toThrow('not found');
    });

    it('should fail when dispute already resolved', async () => {
        mockDisputeRepository.findById.mockResolvedValue({ ...mockDispute, status: 'RESOLVED' });

        await expect(useCase.execute(validRequest)).rejects.toThrow('already closed');
    });

    it('should fail when dispute already rejected', async () => {
        mockDisputeRepository.findById.mockResolvedValue({ ...mockDispute, status: 'REJECTED' });

        await expect(useCase.execute(validRequest)).rejects.toThrow('already closed');
    });

    it('should set resolved timestamp', async () => {
        await useCase.execute(validRequest);

        expect(mockDisputeRepository.update).toHaveBeenCalledWith(
            expect.objectContaining({
                resolvedAt: expect.any(Date),
            })
        );
    });

    it('should publish dispute resolved event', async () => {
        await useCase.execute(validRequest);

        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'COD_DISPUTE_RESOLVED',
                payload: expect.objectContaining({
                    disputeId: 'dispute-1',
                    orderId: 'order-1',
                    decision: 'REFUND_COMMITMENT',
                }),
            })
        );
    });

    it('should handle REFUND_COMMITMENT decision', async () => {
        await useCase.execute({ ...validRequest, decision: 'REFUND_COMMITMENT' });

        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({ decision: 'REFUND_COMMITMENT' }),
            })
        );
    });

    it('should handle FORFEIT_COMMITMENT decision', async () => {
        await useCase.execute({ ...validRequest, decision: 'FORFEIT_COMMITMENT' });

        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({ decision: 'FORFEIT_COMMITMENT' }),
            })
        );
    });

    it('should handle PENALIZE_BOTH decision', async () => {
        await useCase.execute({ ...validRequest, decision: 'PENALIZE_BOTH' });

        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({ decision: 'PENALIZE_BOTH' }),
            })
        );
    });

    it('should handle different resolution messages', async () => {
        const resolutions = [
            'Payment confirmed by courier',
            'Buyer provided proof of payment',
            'Seller withdrew complaint',
        ];

        for (const resolution of resolutions) {
            jest.clearAllMocks();
            await useCase.execute({ ...validRequest, resolution });
            expect(mockDisputeRepository.update).toHaveBeenCalledWith(
                expect.objectContaining({ resolution })
            );
        }
    });

    it('should handle repository errors', async () => {
        mockDisputeRepository.update.mockRejectedValue(new Error('Database error'));

        await expect(useCase.execute(validRequest)).rejects.toThrow('Database error');
    });
});
