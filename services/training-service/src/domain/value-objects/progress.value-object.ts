export class Progress {
  constructor(private readonly value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
  }

  static create(completed: number, total: number): Progress {
    if (!Number.isFinite(completed) || !Number.isFinite(total)) {
      throw new Error('Progress values must be numbers');
    }

    const percentage = total <= 0 ? 0 : (completed / total) * 100;
    return new Progress(Math.min(100, Math.max(0, Math.round(percentage))));
  }

  getValue(): number {
    return this.value;
  }

  getPercentage(): number {
    return this.value;
  }

  isComplete(): boolean {
    return this.value >= 100;
  }
}
