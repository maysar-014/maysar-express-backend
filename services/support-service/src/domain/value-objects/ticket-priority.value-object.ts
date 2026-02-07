import { ValueObject } from '../interfaces';
import { TicketPriority as TicketPriorityEnum } from '../types';

export class TicketPriority implements ValueObject<TicketPriorityEnum> {
    private constructor(private readonly value: TicketPriorityEnum) { }

    public static create(value: TicketPriorityEnum): TicketPriority {
        return new TicketPriority(value);
    }

    public getValue(): TicketPriorityEnum {
        return this.value;
    }

    public equals(other: ValueObject<TicketPriorityEnum>): boolean {
        return this.value === other.getValue();
    }

    public isUrgent(): boolean {
        return this.value === TicketPriorityEnum.URGENT || this.value === TicketPriorityEnum.HIGH;
    }

    public escalate(): TicketPriority {
        switch (this.value) {
            case TicketPriorityEnum.LOW:
                return new TicketPriority(TicketPriorityEnum.MEDIUM);
            case TicketPriorityEnum.MEDIUM:
                return new TicketPriority(TicketPriorityEnum.HIGH);
            case TicketPriorityEnum.HIGH:
                return new TicketPriority(TicketPriorityEnum.URGENT);
            case TicketPriorityEnum.URGENT:
                return this;
            default:
                return this;
        }
    }
}
