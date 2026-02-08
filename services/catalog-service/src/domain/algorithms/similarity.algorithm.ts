
export class SimilarityAlgorithm {
    /**
     * Calculates the Levenshtein distance between two strings.
     * Represents the minimum number of single-character edits (insertions, deletions or substitutions)
     * required to change one word into the other.
     */
    static calculateLevenshteinDistance(a: string, b: string): number {
        const matrix: number[][] = [];

        // Initialize the matrix
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Calculates Jaccard Similarity between two strings (based on character 2-grams).
     * Range: 0 to 1
     */
    static calculateJaccardSimilarity(a: string, b: string): number {
        if (a === b) return 1;
        if (a.length === 0 || b.length === 0) return 0;

        const getGrams = (str: string) => {
            const grams = new Set<string>();
            for (let i = 0; i < str.length - 1; i++) {
                grams.add(str.substring(i, i + 2));
            }
            return grams;
        };

        const gramsA = getGrams(a);
        const gramsB = getGrams(b);

        if (gramsA.size === 0 && gramsB.size === 0) return 1; // Both single chars or empty?
        if (gramsA.size === 0 || gramsB.size === 0) return 0;


        const intersection = new Set([...gramsA].filter(x => gramsB.has(x)));
        const union = new Set([...gramsA, ...gramsB]);

        return intersection.size / union.size;
    }

    /**
     * Calculates a combined similarity score between two strings.
     * Uses a weighted average of normalized Levenshtein and Jaccard.
     * Range: 0 to 1
     */
    static calculateStringSimilarity(a: string, b: string): number {
        if (!a || !b) return 0;
        if (a === b) return 1;

        const maxLength = Math.max(a.length, b.length);
        if (maxLength === 0) return 1;

        const levenshteinDist = this.calculateLevenshteinDistance(a, b);
        const levenshteinSim = 1 - (levenshteinDist / maxLength);

        const jaccardSim = this.calculateJaccardSimilarity(a, b);

        // Weighted average: generic implementation prefers structure (Levenshtein) slightly more?
        // Or we can just average them. Let's give Levenshtein 60% and Jaccard 40%
        return (levenshteinSim * 0.6) + (jaccardSim * 0.4);
    }

    /**
     * Checks if two strings are similar enough based on a threshold.
     */
    static areSimilar(a: string, b: string, threshold: number = 0.85): boolean {
        return this.calculateStringSimilarity(a, b) >= threshold;
    }
}
