import { ConfigurationFingerprintAlgorithm, ConfigurationFingerprintInput } from '../algorithms/configuration-fingerprint.algorithm';

export class ConfigurationFingerprint {
  constructor(
    public readonly value: string,
    public readonly version: number = 1,
    public readonly configurationDefinitionId: string
  ) {}

  static generate(input: ConfigurationFingerprintInput): ConfigurationFingerprint {
    const value = ConfigurationFingerprintAlgorithm.generateFingerprint(input);
    return new ConfigurationFingerprint(value, 1, input.configurationDefinitionId);
  }

  matches(other: ConfigurationFingerprint): boolean {
    return (
      this.version === other.version &&
      this.configurationDefinitionId === other.configurationDefinitionId &&
      this.value === other.value
    );
  }

  toString(): string {
    return this.value;
  }
}
