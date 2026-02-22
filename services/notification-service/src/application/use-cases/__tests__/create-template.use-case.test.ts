import { CreateTemplateUseCase } from '../create-template.use-case';

const mockRepository = { create: jest.fn() } as any;

describe('CreateTemplateUseCase', () => {
    let useCase: CreateTemplateUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateTemplateUseCase(mockRepository);
    });

    it('should create template', async () => {
        mockRepository.create.mockResolvedValue({ id: 't1', name: 'Welcome' });

        const result = await useCase.execute({
            name: 'Welcome',
            type: 'email',
            subject: 'Welcome!',
            body: 'Hello {{name}}'
        });

        expect(result.id).toBe('t1');
    });

    it('should reject template without name', async () => {
        await expect(useCase.execute({ name: '', type: 'email', subject: 'Test', body: 'Body' }))
            .rejects.toThrow('Template name is required');
    });

    it('should reject template without body', async () => {
        await expect(useCase.execute({ name: 'Test', type: 'email', subject: 'Test', body: '' }))
            .rejects.toThrow('Template body is required');
    });

    it('should validate template variables', async () => {
        mockRepository.create.mockResolvedValue({ id: 't2', name: 'Order' });
        const result = await useCase.execute({
            name: 'Order',
            type: 'sms',
            subject: 'Order {{orderId}}',
            body: 'Your order {{orderId}} is ready'
        });
        expect(result.id).toBe('t2');
    });

    it('should handle duplicate template names', async () => {
        mockRepository.create.mockRejectedValue(new Error('Template name already exists'));
        await expect(useCase.execute({ name: 'Welcome', type: 'email', subject: 'Hi', body: 'Hello' }))
            .rejects.toThrow('Template name already exists');
    });

    it('should support multiple template types', async () => {
        mockRepository.create.mockResolvedValue({ id: 't3', type: 'push' });
        const result = await useCase.execute({ name: 'Push', type: 'push', subject: 'Alert', body: 'New message' });
        expect(result.type).toBe('push');
    });
});
