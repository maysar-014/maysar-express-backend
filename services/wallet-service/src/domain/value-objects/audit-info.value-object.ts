export enum ActorType {
    USER = 'USER',
    SYSTEM = 'SYSTEM',
    ADMIN = 'ADMIN'
}

export interface AuditInfoProps {
    actor: string; // User ID or System ID
    actorType: ActorType;
    action: string;
    reason: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
}

export class AuditInfo {
    public constructor(private readonly props: AuditInfoProps) { }

    public static create(props: Omit<AuditInfoProps, 'timestamp'>): AuditInfo {
        return new AuditInfo({
            ...props,
            timestamp: new Date()
        });
    }

    get actor(): string {
        return this.props.actor;
    }

    get actorType(): ActorType {
        return this.props.actorType;
    }

    get action(): string {
        return this.props.action;
    }

    get reason(): string {
        return this.props.reason;
    }

    get timestamp(): Date {
        return this.props.timestamp;
    }

    get ipAddress(): string | undefined {
        return this.props.ipAddress;
    }

    get userAgent(): string | undefined {
        return this.props.userAgent;
    }

    get metadata(): Record<string, unknown> | undefined {
        return this.props.metadata;
    }
}
