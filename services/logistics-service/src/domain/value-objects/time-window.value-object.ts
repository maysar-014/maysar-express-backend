export class TimeWindow {
  private constructor(
    private readonly earliest: Date,
    private readonly latest: Date
  ) {
    if (earliest >= latest) {
      throw new Error('Earliest time must be before latest time');
    }

    const now = new Date();
    if (latest <= now) {
      throw new Error('Latest time must be in the future');
    }
  }

  static create(earliest: Date, latest: Date): TimeWindow {
    return new TimeWindow(earliest, latest);
  }

  static createFromNow(durationMinutes: number): TimeWindow {
    const now = new Date();
    const earliest = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const latest = new Date(now.getTime() + durationMinutes * 60 * 1000);
    return new TimeWindow(earliest, latest);
  }

  static createUrgent(): TimeWindow {
    const now = new Date();
    const earliest = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    const latest = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    return new TimeWindow(earliest, latest);
  }

  static createExpress(): TimeWindow {
    const now = new Date();
    const earliest = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
    const latest = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours from now
    return new TimeWindow(earliest, latest);
  }

  static createStandard(): TimeWindow {
    const now = new Date();
    const earliest = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const latest = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    return new TimeWindow(earliest, latest);
  }

  getEarliest(): Date {
    return new Date(this.earliest);
  }

  getLatest(): Date {
    return new Date(this.latest);
  }

  getDuration(): number {
    return this.latest.getTime() - this.earliest.getTime();
  }

  getDurationHours(): number {
    return this.getDuration() / (1000 * 60 * 60);
  }

  isExpired(): boolean {
    return this.latest <= new Date();
  }

  isAvailable(): boolean {
    return this.earliest <= new Date() && !this.isExpired();
  }

  contains(date: Date): boolean {
    return date >= this.earliest && date <= this.latest;
  }

  overlaps(other: TimeWindow): boolean {
    return this.earliest < other.latest && other.earliest < this.latest;
  }

  extend(hours: number): TimeWindow {
    const extendedLatest = new Date(this.latest.getTime() + hours * 60 * 60 * 1000);
    return new TimeWindow(this.earliest, extendedLatest);
  }

  toString(): string {
    return `${this.earliest.toISOString()} - ${this.latest.toISOString()}`;
  }

  toJSON(): object {
    return {
      earliest: this.earliest.toISOString(),
      latest: this.latest.toISOString()
    };
  }

  equals(other: TimeWindow): boolean {
    return this.earliest.getTime() === other.earliest.getTime() &&
           this.latest.getTime() === other.latest.getTime();
  }
}
