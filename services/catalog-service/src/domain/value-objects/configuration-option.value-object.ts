// @ts-nocheck

import { NormalizationAlgorithm } from '../algorithms/normalization.algorithm';

export interface ConfigurationOptionData {
  id: string;
  configurationDimensionId: string;
  displayValue: string;
  normalizedValue: string;
  sortOrder: number;
  active: boolean;
}

export class ConfigurationOption {
  public readonly normalizedValue: string;

  constructor(
    public readonly id: string,
    public readonly configurationDimensionId: string,
    public readonly displayValue: string,
    normalizedValue: string | undefined,
    public readonly sortOrder: number,
    public readonly active: boolean = true
  ) {
    if (!displayValue.trim()) {
      throw new Error('ConfigurationOption displayValue cannot be empty');
    }
    // Normalize at construction time if not provided
    this.normalizedValue = normalizedValue ?? NormalizationAlgorithm.normalizeText(displayValue);
  }

  isActive(): boolean {
    return this.active;
  }

  toJSON(): ConfigurationOptionData {
    return {
      id: this.id,
      configurationDimensionId: this.configurationDimensionId,
      displayValue: this.displayValue,
      normalizedValue: this.normalizedValue,
      sortOrder: this.sortOrder,
      active: this.active,
    };
  }

  static fromJSON(data: ConfigurationOptionData): ConfigurationOption {
    return new ConfigurationOption(
      data.id,
      data.configurationDimensionId,
      data.displayValue,
      data.normalizedValue,
      data.sortOrder,
      data.active
    );
  }

  /**
   * Returns true if two options have equivalent normalized values.
   * Used for duplicate detection within the same dimension.
   */
  static areEquivalent(a: ConfigurationOption, b: ConfigurationOption): boolean {
    return a.normalizedValue === b.normalizedValue;
  }
}
