import { CreateAgentUseCase, UpdateAgentUseCase } from '../agent-management.use-case';
import { CreateAgentDto, UpdateAgentDto } from '../../dto/agent.dto';

describe('CreateAgentUseCase', () => {
    let useCase: CreateAgentUseCase;
    let mockAgentRepo: any;

    const validDto: CreateAgentDto = {
        userId: 'user-1',
        specializations: ['TECHNICAL', 'BILLING'],
        maxConcurrentTickets: 5,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockAgentRepo = {
            create: jest.fn().mockResolvedValue({ id: 'agent-1', ...validDto }),
        };

        useCase = new CreateAgentUseCase(mockAgentRepo);
    });

    it('should create agent successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(mockAgentRepo.create).toHaveBeenCalled();
    });

    it('should create agent with single specialization', async () => {
        const dto = { ...validDto, specializations: ['TECHNICAL'] };

        const result = await useCase.execute(dto);

        expect(result).toBeDefined();
    });

    it('should create agent with multiple specializations', async () => {
        const dto = { ...validDto, specializations: ['TECHNICAL', 'BILLING', 'GENERAL'] };

        const result = await useCase.execute(dto);

        expect(result).toBeDefined();
    });

    it('should create agent with different max concurrent tickets', async () => {
        const limits = [3, 5, 10, 15];

        for (const maxConcurrentTickets of limits) {
            jest.clearAllMocks();
            await useCase.execute({ ...validDto, maxConcurrentTickets });
            expect(mockAgentRepo.create).toHaveBeenCalled();
        }
    });

    it('should handle repository errors', async () => {
        mockAgentRepo.create.mockRejectedValue(new Error('Database error'));

        await expect(useCase.execute(validDto)).rejects.toThrow('Database error');
    });
});

describe('UpdateAgentUseCase', () => {
    let useCase: UpdateAgentUseCase;
    let mockAgentRepo: any;

    const mockAgent = {
        id: 'agent-1',
        userId: 'user-1',
        specializations: ['TECHNICAL'],
        maxConcurrentTickets: 5,
        updateAvailability: jest.fn(),
    };

    const validDto: UpdateAgentDto = {
        agentId: 'agent-1',
        specializations: ['TECHNICAL', 'BILLING'],
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockAgentRepo = {
            findById: jest.fn().mockResolvedValue(mockAgent),
            update: jest.fn().mockResolvedValue(mockAgent),
        };

        useCase = new UpdateAgentUseCase(mockAgentRepo);
    });

    it('should update agent successfully', async () => {
        const result = await useCase.execute(validDto);

        expect(result).toBeDefined();
        expect(mockAgentRepo.update).toHaveBeenCalled();
    });

    it('should fail when agent not found', async () => {
        mockAgentRepo.findById.mockResolvedValue(null);

        await expect(useCase.execute(validDto)).rejects.toThrow('Agent not found');
    });

    it('should update specializations', async () => {
        const dto = { ...validDto, specializations: ['BILLING', 'GENERAL'] };

        await useCase.execute(dto);

        expect(mockAgent.specializations).toEqual(['BILLING', 'GENERAL']);
    });

    it('should update max concurrent tickets', async () => {
        const dto = { ...validDto, maxConcurrentTickets: 10 };

        await useCase.execute(dto);

        expect(mockAgent.maxConcurrentTickets).toBe(10);
    });

    it('should update availability', async () => {
        const dto = { ...validDto, isAvailable: false };

        await useCase.execute(dto);

        expect(mockAgent.updateAvailability).toHaveBeenCalledWith(false);
    });

    it('should handle partial updates', async () => {
        const dto = { agentId: 'agent-1', maxConcurrentTickets: 8 };

        await useCase.execute(dto);

        expect(mockAgentRepo.update).toHaveBeenCalled();
    });

    it('should handle multiple field updates', async () => {
        const dto = {
            agentId: 'agent-1',
            specializations: ['TECHNICAL'],
            maxConcurrentTickets: 7,
            isAvailable: true,
        };

        await useCase.execute(dto);

        expect(mockAgent.specializations).toEqual(['TECHNICAL']);
        expect(mockAgent.maxConcurrentTickets).toBe(7);
        expect(mockAgent.updateAvailability).toHaveBeenCalledWith(true);
    });
});
