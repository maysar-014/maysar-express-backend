export class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly postalCode: string,
    public readonly country: string
  ) {
    if (!street || !city || !postalCode || !country) {
      throw new Error('All address fields are required');
    }
  }

  public toString(): string {
    return `${this.street}, ${this.city}, ${this.postalCode}, ${this.country}`;
  }

  public equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.postalCode === other.postalCode &&
      this.country === other.country
    );
  }
}
