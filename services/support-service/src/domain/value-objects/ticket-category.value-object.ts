import { ValueObject } from '../interfaces';

export enum TicketCategoryType {
    ACCOUNT = 'ACCOUNT',
    ORDER = 'ORDER',
    PAYMENT = 'PAYMENT',
    TECHNICAL = 'TECHNICAL',
    GENERAL = 'GENERAL'
}

export class TicketCategory implements ValueObject<string> {
    private constructor(private readonly value: string) { }

    public static create(value: string): TicketCategory {
        const validCategories = Object.values(TicketCategoryType) as string[];
        if (!validCategories.includes(value.toUpperCase())) {
            throw new Error(`Invalid ticket category: ${value}. Must be one of ${validCategories.join(', ')}`);
        }
        return new TicketCategory(value.toUpperCase());
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: ValueObject<string>): boolean {
        return this.value === other.getValue();
    }

    public getSpecialization(): string {
        return this.value;
    }
}
