export class Email {
  constructor(private readonly value: string) {}
  toString(): string { return this.value; }
  static create(email: string): Email { return new Email(email); }
}
