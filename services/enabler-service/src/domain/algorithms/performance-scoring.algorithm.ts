export interface PerformanceInput {
    salesVolume: number; // Normalized 0-1
    completionRate: number; // 0-1
    rating: number; // 0-5
}

export class PerformanceScoringAlgorithm {

    static calculateScore(input: PerformanceInput): number {
        const salesWeight = 0.4;
        const completionWeight = 0.3;
        const ratingWeight = 0.3;

        const normalizedRating = input.rating / 5.0;

        const score = (input.salesVolume * salesWeight) +
            (input.completionRate * completionWeight) +
            (normalizedRating * ratingWeight);

        return Math.min(Math.max(score * 100, 0), 100); // 0-100 scale
    }
}
