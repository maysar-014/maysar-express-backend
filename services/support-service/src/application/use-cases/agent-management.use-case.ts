import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { TYPES } from '../../types';
import { ISupportAgentRepository } from '../../domain/repositories/interfaces';
import { CreateAgentDto, UpdateAgentDto, AgentResponseDto } from '../dto/agent.dto';
import { SupportAgent } from '../../domain/entities/support-agent.entity';
import { AgentMapper } from '../mappers/agent.mapper';

@injectable()
export class CreateAgentUseCase {
    constructor(
        @inject(TYPES.ISupportAgentRepository) private agentRepository: ISupportAgentRepository
    ) { }

    public async execute(dto: CreateAgentDto): Promise<AgentResponseDto> {
        const agentId = uuidv4();
        const agent = SupportAgent.create({
            id: agentId,
            userId: dto.userId,
            specializations: dto.specializations,
            maxConcurrentTickets: dto.maxConcurrentTickets
        });

        const savedAgent = await this.agentRepository.create(agent);
        return AgentMapper.toResponseDto(savedAgent);
    }
}

@injectable()
export class UpdateAgentUseCase {
    constructor(
        @inject(TYPES.ISupportAgentRepository) private agentRepository: ISupportAgentRepository
    ) { }

    public async execute(dto: UpdateAgentDto): Promise<AgentResponseDto> {
        const agent = await this.agentRepository.findById(dto.agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${dto.agentId}`);
        }

        if (dto.specializations) agent.specializations = dto.specializations;
        if (dto.maxConcurrentTickets) agent.maxConcurrentTickets = dto.maxConcurrentTickets;
        if (dto.isAvailable !== undefined) agent.updateAvailability(dto.isAvailable);

        const updatedAgent = await this.agentRepository.update(agent);
        return AgentMapper.toResponseDto(updatedAgent);
    }
}
