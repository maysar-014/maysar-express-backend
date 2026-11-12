// @ts-nocheck

import { ConfigurationDimension, ConfigurationDimensionData } from '../value-objects/configuration-dimension.value-object';
import { ConfigurationOption, ConfigurationOptionData } from '../value-objects/configuration-option.value-object';
import { ConfigurationFingerprint } from '../value-objects/configuration-fingerprint.value-object';
import { ConfigurationFingerprintAlgorithm, ConfigurationFingerprintInput } from '../algorithms/configuration-fingerprint.algorithm';
import { NormalizationAlgorithm } from '../algorithms/normalization.algorithm';
import { DomainError } from '../errors/domain.error';

// ── Types ────────────────────────────────────────────────────────────────────

export type ConfigurationDefinitionStatus = 'draft' | 'active' | 'archived';

export type DependencyType = 'conditional' | 'dependent' | 'mutually_exclusive' | 'required' | 'optional';

export type ConstraintType = 'requires' | 'excludes' | 'compatible_with' | 'incompatible_with';

export interface ConfigurationDependencyData {
  id: string;
  type: DependencyType;
  sourceDimensionId: string;
  sourceOptionId: string;
  targetDimensionId: string;
  targetOptionIds: string[];
}

export interface ConfigurationConstraintData {
  id: string;
  type: ConstraintType;
  sourceOptionId: string;
  targetOptionId: string;
  ruleExpression?: string;
}

export interface ConfigurationCombinationData {
  id: string;
  configurationDefinitionId: string;
  /** Map of dimensionId → array of optionIds */
  optionSelections: Record<string, string[]>;
  fingerprint: string;
  active: boolean;
}

export interface ConfigurationDefinitionData {
  id: string;
  productId: string;
  version: number;
  status: ConfigurationDefinitionStatus;
  dimensions: ConfigurationDimensionData[];
  options: ConfigurationOptionData[];
  dependencies: ConfigurationDependencyData[];
  constraints: ConfigurationConstraintData[];
  combinations: ConfigurationCombinationData[];
  predecessorVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Pure Functions (for PBT) ──────────────────────────────────────────────────

/**
 * Validates that a set of option selections matches an explicitly defined
 * ConfigurationCombination by fingerprint.
 */
export function validateCombination(
  selections: Record<string, string[]>,
  combinations: ConfigurationCombinationData[]
): { matches: boolean; combination: ConfigurationCombinationData | null } {
  const fingerprint = ConfigurationFingerprintAlgorithm.generateFingerprint({
    configurationDefinitionId: '',
    selections,
  });

  for (const combo of combinations) {
    if (combo.fingerprint === fingerprint) {
      return { matches: true, combination: combo };
    }
  }
  return { matches: false, combination: null };
}

/**
 * Serializes a ConfigurationDefinitionData to a JSON string.
 */
export function serializeConfigurationDefinition(data: ConfigurationDefinitionData): string {
  return JSON.stringify(data);
}

/**
 * Deserializes a JSON string back to a ConfigurationDefinitionData.
 */
export function deserializeConfigurationDefinition(json: string): ConfigurationDefinitionData {
  return JSON.parse(json) as ConfigurationDefinitionData;
}

/**
 * Checks structural equality between two ConfigurationDefinitionData instances.
 */
export function configurationDefinitionsEqual(
  a: ConfigurationDefinitionData,
  b: ConfigurationDefinitionData
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── Entity ────────────────────────────────────────────────────────────────────

export class ConfigurationDefinition {
  private dimensions: Map<string, ConfigurationDimension> = new Map();
  private options: Map<string, ConfigurationOption> = new Map();
  private dependencies: ConfigurationDependencyData[] = [];
  private constraints: ConfigurationConstraintData[] = [];
  private combinations: ConfigurationCombinationData[] = [];

  constructor(
    private readonly id: string,
    private readonly productId: string,
    private version: number,
    private status: ConfigurationDefinitionStatus,
    private predecessorVersionId: string | null = null,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  // ── Getters ──────────────────────────────────────────────────────────────────

  getId(): string { return this.id; }
  getProductId(): string { return this.productId; }
  getVersion(): number { return this.version; }
  getStatus(): ConfigurationDefinitionStatus { return this.status; }
  getPredecessorVersionId(): string | null { return this.predecessorVersionId; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }

  getDimensions(): ConfigurationDimension[] {
    return Array.from(this.dimensions.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getOptions(): ConfigurationOption[] {
    return Array.from(this.options.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getOptionsForDimension(dimensionId: string): ConfigurationOption[] {
    return this.getOptions().filter(o => o.configurationDimensionId === dimensionId);
  }

  getDependencies(): ConfigurationDependencyData[] { return [...this.dependencies]; }
  getConstraints(): ConfigurationConstraintData[] { return [...this.constraints]; }
  getCombinations(): ConfigurationCombinationData[] { return [...this.combinations]; }
  getActiveCombinations(): ConfigurationCombinationData[] {
    return this.combinations.filter(c => c.active);
  }

  // ── Dimension Management ──────────────────────────────────────────────────────

  addDimension(dimension: ConfigurationDimension): void {
    if (this.status === 'archived') {
      throw new DomainError('Cannot modify archived ConfigurationDefinition', 'ARCHIVED_DEFINITION');
    }
    // Reject duplicate dimension names
    for (const existing of this.dimensions.values()) {
      if (existing.name.toLowerCase() === dimension.name.toLowerCase()) {
        throw new DomainError(
          `Duplicate dimension name: ${dimension.name}`,
          'DUPLICATE_DIMENSION_NAME'
        );
      }
    }
    this.dimensions.set(dimension.id, dimension);
    this.touch();
  }

  getDimension(id: string): ConfigurationDimension | undefined {
    return this.dimensions.get(id);
  }

  // ── Option Management ────────────────────────────────────────────────────────

  addOption(option: ConfigurationOption): void {
    if (this.status === 'archived') {
      throw new DomainError('Cannot modify archived ConfigurationDefinition', 'ARCHIVED_DEFINITION');
    }
    // Verify the option's dimension exists
    if (!this.dimensions.has(option.configurationDimensionId)) {
      throw new DomainError(
        `Option references unknown dimension: ${option.configurationDimensionId}`,
        'UNKNOWN_DIMENSION_REFERENCE'
      );
    }
    // Reject duplicate normalized values within the same dimension
    for (const existing of this.options.values()) {
      if (existing.configurationDimensionId === option.configurationDimensionId &&
          ConfigurationOption.areEquivalent(existing, option)) {
        throw new DomainError(
          `Duplicate option normalized value: ${option.normalizedValue}`,
          'DUPLICATE_OPTION_VALUE'
        );
      }
    }
    this.options.set(option.id, option);
    this.touch();
  }

  getOption(id: string): ConfigurationOption | undefined {
    return this.options.get(id);
  }

  // ── Dependency Management ────────────────────────────────────────────────────

  addDependency(dependency: ConfigurationDependencyData): void {
    if (this.status === 'archived') {
      throw new DomainError('Cannot modify archived ConfigurationDefinition', 'ARCHIVED_DEFINITION');
    }
    this.validateDependencyReferences(dependency);
    this.dependencies.push(dependency);
    this.touch();
  }

  private validateDependencyReferences(dependency: ConfigurationDependencyData): void {
    if (!this.dimensions.has(dependency.sourceDimensionId)) {
      throw new DomainError(
        `Dependency source dimension not found: ${dependency.sourceDimensionId}`,
        'DEPENDENCY_REFERENCE_ERROR'
      );
    }
    if (!this.options.has(dependency.sourceOptionId)) {
      throw new DomainError(
        `Dependency source option not found: ${dependency.sourceOptionId}`,
        'DEPENDENCY_REFERENCE_ERROR'
      );
    }
    if (!this.dimensions.has(dependency.targetDimensionId)) {
      throw new DomainError(
        `Dependency target dimension not found: ${dependency.targetDimensionId}`,
        'DEPENDENCY_REFERENCE_ERROR'
      );
    }
    for (const targetOptionId of dependency.targetOptionIds) {
      if (!this.options.has(targetOptionId)) {
        throw new DomainError(
          `Dependency target option not found: ${targetOptionId}`,
          'DEPENDENCY_REFERENCE_ERROR'
        );
      }
    }
  }

  // ── Constraint Management ────────────────────────────────────────────────────

  addConstraint(constraint: ConfigurationConstraintData): void {
    if (this.status === 'archived') {
      throw new DomainError('Cannot modify archived ConfigurationDefinition', 'ARCHIVED_DEFINITION');
    }
    this.validateConstraintReferences(constraint);
    this.constraints.push(constraint);
    this.touch();
  }

  private validateConstraintReferences(constraint: ConfigurationConstraintData): void {
    if (!this.options.has(constraint.sourceOptionId)) {
      throw new DomainError(
        `Constraint source option not found: ${constraint.sourceOptionId}`,
        'CONSTRAINT_REFERENCE_ERROR'
      );
    }
    if (!this.options.has(constraint.targetOptionId)) {
      throw new DomainError(
        `Constraint target option not found: ${constraint.targetOptionId}`,
        'CONSTRAINT_REFERENCE_ERROR'
      );
    }
  }

  // ── Combination Management ───────────────────────────────────────────────────

  addCombination(combo: ConfigurationCombinationData): void {
    if (this.status === 'archived') {
      throw new DomainError('Cannot modify archived ConfigurationDefinition', 'ARCHIVED_DEFINITION');
    }
    // Validate that each referenced option exists in its corresponding dimension
    for (const [dimId, optionIds] of Object.entries(combo.optionSelections)) {
      if (!this.dimensions.has(dimId)) {
        throw new DomainError(
          `Combination references unknown dimension: ${dimId}`,
          'COMBINATION_REFERENCE_ERROR'
        );
      }
      for (const optId of optionIds) {
        const option = this.options.get(optId);
        if (!option) {
          throw new DomainError(
            `Combination references unknown option: ${optId}`,
            'COMBINATION_REFERENCE_ERROR'
          );
        }
        if (option.configurationDimensionId !== dimId) {
          throw new DomainError(
            `Combination option ${optId} does not belong to dimension ${dimId}`,
            'COMBINATION_REFERENCE_ERROR'
          );
        }
      }
    }
    // Generate fingerprint and check for duplicates
    const fingerprint = ConfigurationFingerprint.generate({
      configurationDefinitionId: this.id,
      selections: this.resolveSelectionsToFingerprintInput(combo.optionSelections),
    });
    const comboWithFingerprint = { ...combo, fingerprint: fingerprint.value };

    for (const existing of this.combinations) {
      if (existing.fingerprint === comboWithFingerprint.fingerprint) {
        throw new DomainError(
          'Duplicate configuration combination (same fingerprint)',
          'DUPLICATE_COMBINATION'
        );
      }
    }
    this.combinations.push(comboWithFingerprint);
    this.touch();
  }

  private resolveSelectionsToFingerprintInput(
    selections: Record<string, string[]>
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [dimId, optionIds] of Object.entries(selections)) {
      result[dimId] = optionIds.map(optId => {
        const option = this.options.get(optId);
        return option ? option.normalizedValue : optId;
      });
    }
    return result;
  }

  // ── Versioning ───────────────────────────────────────────────────────────────

  /**
   * Returns true if structural elements (dimensions, options, dependencies,
   * constraints) have changed, requiring a new version.
   */
  isStructuralChange(other: ConfigurationDefinition): boolean {
    // Compare dimensions
    if (this.dimensions.size !== other.dimensions.size) return true;
    for (const dim of this.dimensions.values()) {
      const otherDim = other.dimensions.get(dim.id);
      if (!otherDim) return true;
      if (JSON.stringify(dim.toJSON()) !== JSON.stringify(otherDim.toJSON())) return true;
    }
    // Compare options
    if (this.options.size !== other.options.size) return true;
    for (const opt of this.options.values()) {
      const otherOpt = other.options.get(opt.id);
      if (!otherOpt) return true;
      if (JSON.stringify(opt.toJSON()) !== JSON.stringify(otherOpt.toJSON())) return true;
    }
    // Compare dependencies
    if (this.dependencies.length !== other.dependencies.length) return true;
    if (JSON.stringify(this.dependencies) !== JSON.stringify(other.dependencies)) return true;
    // Compare constraints
    if (this.constraints.length !== other.constraints.length) return true;
    if (JSON.stringify(this.constraints) !== JSON.stringify(other.constraints)) return true;
    return false;
  }

  /**
   * Creates a new version of this definition, preserving a reference to
   * the current version as predecessor.
   */
  createNewVersion(): ConfigurationDefinition {
    const newVersion = new ConfigurationDefinition(
      `${this.id}-v${this.version + 1}`,
      this.productId,
      this.version + 1,
      'draft',
      this.id,
      new Date(),
      new Date()
    );
    // Copy structural elements
    for (const dim of this.dimensions.values()) {
      newVersion.dimensions.set(dim.id, dim);
    }
    for (const opt of this.options.values()) {
      newVersion.options.set(opt.id, opt);
    }
    newVersion.dependencies = [...this.dependencies];
    newVersion.constraints = [...this.constraints];
    newVersion.combinations = [...this.combinations];
    return newVersion;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  transitionTo(newStatus: ConfigurationDefinitionStatus): void {
    if (this.status === 'archived') {
      throw new DomainError(
        'Cannot transition from archived status',
        'ARCHIVED_DEFINITION'
      );
    }
    if (newStatus === 'active') {
      this.validateForActivation();
    }
    this.status = newStatus;
    this.touch();
  }

  private validateForActivation(): void {
    if (this.dimensions.size === 0) {
      throw new DomainError(
        'Cannot activate: at least one dimension required',
        'ACTIVATION_VALIDATION_ERROR'
      );
    }
    if (this.options.size === 0) {
      throw new DomainError(
        'Cannot activate: at least one option required',
        'ACTIVATION_VALIDATION_ERROR'
      );
    }
    if (this.combinations.length === 0) {
      throw new DomainError(
        'Cannot activate: at least one combination required',
        'ACTIVATION_VALIDATION_ERROR'
      );
    }
  }

  // ── Serialization ─────────────────────────────────────────────────────────────

  toJSON(): ConfigurationDefinitionData {
    return {
      id: this.id,
      productId: this.productId,
      version: this.version,
      status: this.status,
      dimensions: Array.from(this.dimensions.values()).map(d => d.toJSON()),
      options: Array.from(this.options.values()).map(o => o.toJSON()),
      dependencies: [...this.dependencies],
      constraints: [...this.constraints],
      combinations: [...this.combinations],
      predecessorVersionId: this.predecessorVersionId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  static fromJSON(data: ConfigurationDefinitionData): ConfigurationDefinition {
    const entity = new ConfigurationDefinition(
      data.id,
      data.productId,
      data.version,
      data.status,
      data.predecessorVersionId,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
    for (const dimData of data.dimensions) {
      entity.dimensions.set(dimData.id, ConfigurationDimension.fromJSON(dimData));
    }
    for (const optData of data.options) {
      entity.options.set(optData.id, ConfigurationOption.fromJSON(optData));
    }
    entity.dependencies = [...data.dependencies];
    entity.constraints = [...data.constraints];
    entity.combinations = [...data.combinations];
    return entity;
  }

  // ── Factory ──────────────────────────────────────────────────────────────────

  static create(productId: string): ConfigurationDefinition {
    return new ConfigurationDefinition(
      `cfg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId,
      1,
      'draft',
      null,
      new Date(),
      new Date()
    );
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
