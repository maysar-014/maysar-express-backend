/**
 * ScoringAlgorithm provides pure, deterministic computation for training scores.
 */
export class ScoringAlgorithm {
    /**
     * Calculates a final grade based on a raw score.
     */
    public calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Determines if a score is passing based on a minimum threshold.
     */
    public isPassing(score: number, threshold: number): boolean {
        return score >= threshold;
    }
}
