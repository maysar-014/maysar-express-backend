export interface CreateAgentDto {
    userId: string;
    specializations?: string[];
    maxConcurrentTickets?: number;
}

export interface UpdateAgentDto {
    agentId: string;
    specializations?: string[];
    maxConcurrentTickets?: number;
    isAvailable?: boolean;
}

export interface AgentResponseDto {
    id: string;
    userId: string;
    specializations: string[];
    maxConcurrentTickets: number;
    currentTicketCount: number;
    isAvailable: boolean;
    metrics: AgentStatsDto;
    createdAt: Date;
    updatedAt: Date;
}

export interface AgentStatsDto {
    totalTicketsResolved: number;
    averageResolutionTime?: number;
    rating?: number;
}
