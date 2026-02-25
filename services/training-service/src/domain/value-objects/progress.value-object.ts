export class Progress {
  constructor(private readonly value: number) {
    if (value < 0 || value > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
  }

  getValue(): number {
    return this.value;
  }
}