export const TYPES = {
    PrismaClient: Symbol.for('PrismaClient'),
    EventBus: Symbol.for('EventBus'),

    // Repositories
    ITicketRepository: Symbol.for('ITicketRepository'),
    ISupportAgentRepository: Symbol.for('ISupportAgentRepository'),
    ITicketMessageRepository: Symbol.for('ITicketMessageRepository'),
    ITicketStatusHistoryRepository: Symbol.for('ITicketStatusHistoryRepository'),
    ITicketAttachmentRepository: Symbol.for('ITicketAttachmentRepository'),

    // Policies
    TicketAssignmentPolicy: Symbol.for('TicketAssignmentPolicy'),
    TicketEscalationPolicy: Symbol.for('TicketEscalationPolicy'),

    // Use Cases
    CreateTicketUseCase: Symbol.for('CreateTicketUseCase'),
    AssignTicketUseCase: Symbol.for('AssignTicketUseCase'),
    UpdateTicketStatusUseCase: Symbol.for('UpdateTicketStatusUseCase'),
    AddMessageUseCase: Symbol.for('AddMessageUseCase'),
    ResolveTicketUseCase: Symbol.for('ResolveTicketUseCase'),
    CloseTicketUseCase: Symbol.for('CloseTicketUseCase'),
    GetTicketUseCase: Symbol.for('GetTicketUseCase'),
    ListTicketsUseCase: Symbol.for('ListTicketsUseCase'),
    AutoAssignTicketUseCase: Symbol.for('AutoAssignTicketUseCase'),
    CreateAgentUseCase: Symbol.for('CreateAgentUseCase'),
    UpdateAgentUseCase: Symbol.for('UpdateAgentUseCase'),

    // Messaging
    SupportEventPublisher: Symbol.for('SupportEventPublisher'),
    SupportEventSubscriber: Symbol.for('SupportEventSubscriber'),
    SupportOutboxRepository: Symbol.for('SupportOutboxRepository'),

    // Controllers
    TicketController: Symbol.for('TicketController'),
    AgentController: Symbol.for('AgentController')
};
