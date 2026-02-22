import { ValidateExpertiseUseCase } from '../validate-expertise.use-case';

const mockPolicy = { validate: jest.fn() } as any;

describe('ValidateExpertiseUseCase', () => {
    let useCase: ValidateExpertiseUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new ValidateExpertiseUseCase(mockPolicy);
    });

    it('should validate expertise', async () => {
        mockPolicy.validate.mockReturnValue({ isValid: true });
        const result = await useCase.execute({ userId: 'u1', domain: 'farming' });
        expect(result.isValid).toBe(true);
    });
});
