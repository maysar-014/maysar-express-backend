export class PhoneNumber {
  constructor(private readonly value: string) {}
  toString(): string { return this.value; }
  static create(phone: string): PhoneNumber { return new PhoneNumber(phone); }
}
