export interface Entity {
    id: string;
}

export interface ValueObject<T> {
    getValue(): T;
    equals(other: ValueObject<T>): boolean;
}
