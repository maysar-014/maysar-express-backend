import { ValueObject } from '../interfaces';

export class TicketSubject implements ValueObject<string> {
    private constructor(private readonly value: string) { }

    public static create(value: string): TicketSubject {
        if (!value || value.trim().length < 5 || value.trim().length > 200) {
            throw new Error('Ticket subject must be between 5 and 200 characters');
        }

        // Simple validation: no excessive special characters
        const specialCharCount = (value.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length;
        if (specialCharCount > value.length * 0.5) {
            throw new Error('Ticket subject contains too many special characters');
        }

        return new TicketSubject(value.trim());
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: ValueObject<string>): boolean {
        return this.value === other.getValue();
    }
}
