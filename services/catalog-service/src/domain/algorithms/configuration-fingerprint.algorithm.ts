import { createHash } from 'crypto';
import { NormalizationAlgorithm } from './normalization.algorithm';

export interface ConfigurationFingerprintInput {
  configurationDefinitionId: string;
  /** Map of dimensionId → array of selected option normalized values */
  selections: Record<string, string[]>;
}

export class ConfigurationFingerprintAlgorithm {
  /**
   * Generates a deterministic, order-independent fingerprint from a set of
   * dimension-option selections.
   *
   * Algorithm:
   * 1. Sort dimension IDs alphabetically
   * 2. For each dimension, sort its option normalized values alphabetically
   * 3. Build a canonical string: dimId1:opt1|opt2;dimId2:opt3|opt4
   * 4. SHA-256 hash the canonical string → 64-char lowercase hex
   */
  static generateFingerprint(input: ConfigurationFingerprintInput): string {
    const { configurationDefinitionId, selections } = input;

    // Sort dimension IDs for order independence
    const sortedDimIds = Object.keys(selections).sort();

    const parts: string[] = [];
    for (const dimId of sortedDimIds) {
      // Sort option values within each dimension for order independence
      const sortedOptions = [...selections[dimId]].sort();
      // Normalize each option value
      const normalizedOptions = sortedOptions.map(v =>
        NormalizationAlgorithm.normalizeText(v)
      );
      parts.push(`${dimId}:${normalizedOptions.join('|')}`);
    }

    const canonicalString = parts.join(';');
    return createHash('sha256').update(canonicalString).digest('hex');
  }

  /**
   * Validates that a string is a valid 64-character lowercase hexadecimal
   * SHA-256 fingerprint.
   */
  static validateFingerprint(fingerprint: string): boolean {
    return /^[a-f0-9]{64}$/.test(fingerprint);
  }
}
