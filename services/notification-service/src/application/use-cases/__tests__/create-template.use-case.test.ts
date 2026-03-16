import { CreateTemplateUseCase } from '../create-template.use-case';

const mockRepository = { create: jest.fn() } as any;
const mockValidationService = { validateTemplate: jest.fn() } as any;

describe('CreateTemplateUseCase', () => {
    let useCase: CreateTemplateUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateTemplateUseCase(mockRepository, mockValidationService);
    });

    it('should create template', async () => {
        mockRepository.create.mockResolvedValue({ id: 't1', name: 'Welcome' });

        const result = await useCase.execute({
            name: 'Welcome',
            type: 'email',
            channel: 'email',
            subject: 'Welcome!',
            bodyTemplate: 'Hello {{name}}',
            createdBy: 'system'
        });

        expect(result.id).toBe('t1');
    });

    it('should reject template without name', async () => {
        await expect(useCase.execute({
            name: '',
            type: 'email',
            channel: 'email',
            subject: 'Test',
            bodyTemplate: 'Body',
            createdBy: 'system'
        }))
            .rejects.toThrow('Template name is required');
    });

    it('should reject template without body', async () => {
        await expect(useCase.execute({
            name: 'Test',
            type: 'email',
            channel: 'email',
            subject: 'Test',
            bodyTemplate: '',
            createdBy: 'system'
        }))
            .rejects.toThrow('Body template is required');
    });

    it('should validate template variables', async () => {
        mockRepository.create.mockResolvedValue({ id: 't2', name: 'Order' });
        const result = await useCase.execute({
            name: 'Order',
            type: 'sms',
            channel: 'sms',
            subject: 'Order {{orderId}}',
            bodyTemplate: 'Your order {{orderId}} is ready',
            createdBy: 'system'
        });
        expect(result.id).toBe('t2');
    });

    it('should handle duplicate template names', async () => {
        mockRepository.create.mockRejectedValue(new Error('Template name already exists'));
        await expect(useCase.execute({
            name: 'Welcome',
            type: 'email',
            channel: 'email',
            subject: 'Hi',
            bodyTemplate: 'Hello',
            createdBy: 'system'
        }))
            .rejects.toThrow('Template name already exists');
    });

    it('should support multiple template types', async () => {
        mockRepository.create.mockResolvedValue({ id: 't3', type: 'push' });
        const result = await useCase.execute({
            name: 'Push',
            type: 'push',
            channel: 'push',
            subject: 'Alert',
            bodyTemplate: 'New message',
            createdBy: 'system'
        });
        expect(result.type).toBe('push');
    });
});
