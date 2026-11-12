// @ts-nocheck
/**
 * Configuration Fingerprint — Property-Based Tests
 *
 * Verifies determinism, order-independence, normalized equivalence,
 * distinctness, and format correctness of ConfigurationFingerprintAlgorithm.
 *
 * No database required — pure algorithm tests.
 *
 * Feature: configuration-definition-foundation
 */

import { ConfigurationFingerprintAlgorithm, ConfigurationFingerprintInput } from '../../algorithms/configuration-fingerprint.algorithm';
import { ConfigurationFingerprint } from '../configuration-fingerprint.value-object';

// ── Helpers ──────────────────────────────────────────────────────────────────

function forAll<T>(
  count: number,
  generator: () => T,
  property: (value: T) => void | Promise<void>
): Promise<void> {
  return (async () => {
    for (let i = 0; i < count; i++) {
      await property(generator());
    }
  })();
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Shuffle array in place (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate a random ConfigurationFingerprintInput */
function randomInput(): ConfigurationFingerprintInput {
  const defId = `cfg-def-${randomSuffix()}`;
  const numDims = randomInt(1, 5);
  const selections: Record<string, string[]> = {};
  for (let d = 0; d < numDims; d++) {
    const dimId = `dim-${randomSuffix()}`;
    const numOpts = randomInt(1, 4);
    selections[dimId] = Array.from({ length: numOpts }, () => `opt-${randomSuffix()}`);
  }
  return { configurationDefinitionId: defId, selections };
}

// ── Property 1: Order Independence
// Feature: configuration-definition-foundation, Property 1: Order Independence
// Validates: Requirements 13.1
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 1: Order Independence', () => {
  it('should produce identical fingerprints regardless of dimension or option order', async () => {
    await forAll(
      100,
      randomInput,
      (input) => {
        const fp1 = ConfigurationFingerprintAlgorithm.generateFingerprint(input);

        // Shuffle dimensions
        const shuffledDimIds = shuffle(Object.keys(input.selections));
        const shuffledSelections: Record<string, string[]> = {};
        for (const dimId of shuffledDimIds) {
          // Also shuffle options within each dimension
          shuffledSelections[dimId] = shuffle(input.selections[dimId]);
        }
        const fp2 = ConfigurationFingerprintAlgorithm.generateFingerprint({
          ...input,
          selections: shuffledSelections,
        });

        expect(fp1).toBe(fp2);
      }
    );
  });
});

// ── Property 2: Normalized Equivalence
// Feature: configuration-definition-foundation, Property 2: Normalized Equivalence
// Validates: Requirements 13.2
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 2: Normalized Equivalence', () => {
  it('should produce identical fingerprints for options that normalize to the same value', async () => {
    await forAll(
      100,
      () => {
        const defId = `cfg-def-${randomSuffix()}`;
        const dimId = `dim-${randomSuffix()}`;
        // Generate an option value with uppercase; normalization will lowercase it
        const baseValue = `option-${randomSuffix()}`;
        return {
          defId,
          dimId,
          lowercase: baseValue.toLowerCase(),
          uppercase: baseValue.toUpperCase(),
        };
      },
      ({ defId, dimId, lowercase, uppercase }) => {
        const fp1 = ConfigurationFingerprintAlgorithm.generateFingerprint({
          configurationDefinitionId: defId,
          selections: { [dimId]: [lowercase] },
        });
        const fp2 = ConfigurationFingerprintAlgorithm.generateFingerprint({
          configurationDefinitionId: defId,
          selections: { [dimId]: [uppercase] },
        });
        // Both should normalize to the same value via NormalizationAlgorithm.normalizeText()
        expect(fp1).toBe(fp2);
      }
    );
  });
});

// ── Property 3: Distinctness
// Feature: configuration-definition-foundation, Property 3: Distinctness
// Validates: Requirements 13.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 3: Distinctness', () => {
  it('should produce different fingerprints for meaningfully different selections', async () => {
    await forAll(
      100,
      () => {
        const defId = `cfg-def-${randomSuffix()}`;
        const dimId = `dim-${randomSuffix()}`;
        const opt1 = `opt-a-${randomSuffix()}`;
        const opt2 = `opt-b-${randomSuffix()}`;
        return { defId, dimId, opt1, opt2 };
      },
      ({ defId, dimId, opt1, opt2 }) => {
        // Only run this property when the two options normalize differently
        const { NormalizationAlgorithm } = require('../../algorithms/normalization.algorithm');
        if (NormalizationAlgorithm.normalizeText(opt1) === NormalizationAlgorithm.normalizeText(opt2)) return;

        const fp1 = ConfigurationFingerprintAlgorithm.generateFingerprint({
          configurationDefinitionId: defId,
          selections: { [dimId]: [opt1] },
        });
        const fp2 = ConfigurationFingerprintAlgorithm.generateFingerprint({
          configurationDefinitionId: defId,
          selections: { [dimId]: [opt2] },
        });
        expect(fp1).not.toBe(fp2);
      }
    );
  });
});

// ── Property 4: Format Invariant
// Feature: configuration-definition-foundation, Property 4: Format Invariant
// Validates: Requirements 13.4
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 4: Format Invariant', () => {
  it('should always produce a 64-character lowercase hexadecimal string', async () => {
    await forAll(
      100,
      randomInput,
      (input) => {
        const fp = ConfigurationFingerprintAlgorithm.generateFingerprint(input);
        expect(fp).toMatch(/^[a-f0-9]{64}$/);
        expect(ConfigurationFingerprintAlgorithm.validateFingerprint(fp)).toBe(true);
      }
    );
  });

  it('ConfigurationFingerprint.generate should produce a valid fingerprint value', async () => {
    await forAll(
      50,
      randomInput,
      (input) => {
        const fp = ConfigurationFingerprint.generate(input);
        expect(fp.toString()).toMatch(/^[a-f0-9]{64}$/);
        expect(fp.configurationDefinitionId).toBe(input.configurationDefinitionId);
        expect(fp.version).toBe(1);
      }
    );
  });
});
