import { RegisterEnablerUseCase } from '../register-enabler.use-case';

describe('RegisterEnablerUseCase', () => {
    it('registers an enabler and initializes analytics + policy', async () => {
        const enablerRepository = {
            findByUserId: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue(undefined)
        };
        const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
        const analyticsRepository = { upsertInitial: jest.fn().mockResolvedValue(undefined) };
        const policyRepository = { createDefaultPolicy: jest.fn().mockResolvedValue(undefined) };

        const useCase = new RegisterEnablerUseCase(
            enablerRepository as never,
            eventPublisher,
            analyticsRepository as never,
            policyRepository as never
        );

        const result = await useCase.execute({
            userId: 'user-1',
            businessName: 'Bright Traders',
            businessDescription: 'Retail supplies',
            taxId: 'TAX-123',
            yearsInBusiness: 2,
            hasBusinessLicense: true,
            salesExperience: 2,
            contactEmail: 'hello@example.com',
            contactPhone: '+255700000000'
        });

        expect(enablerRepository.findByUserId).toHaveBeenCalledWith('user-1');
        expect(enablerRepository.save).toHaveBeenCalledTimes(1);
        expect(analyticsRepository.upsertInitial).toHaveBeenCalledTimes(1);
        expect(policyRepository.createDefaultPolicy).toHaveBeenCalledWith(
            expect.any(String),
            'user-1'
        );
        expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
        expect(result.id).toBeDefined();
    });
});
