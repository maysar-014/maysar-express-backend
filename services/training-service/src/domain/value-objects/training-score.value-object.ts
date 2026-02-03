export class TrainingScore {
    private constructor(private readonly value: number) {
        if (value < 0 || value > 100) {
            throw new Error('Score must be between 0 and 100');
        }
    }

    public static create(value: number): TrainingScore {
        return new TrainingScore(value);
    }

    public getValue(): number {
        return this.value;
    }

    public isPassingScore(minimumScore: number): boolean {
        return this.value >= minimumScore;
    }

    public getGrade(): string {
        if (this.value >= 90) return 'A';
        if (this.value >= 80) return 'B';
        if (this.value >= 70) return 'C';
        if (this.value >= 60) return 'D';
        return 'F';
    }

    public getPercentage(): string {
        return `${this.value}%`;
    }
}
