import { ConfigurationDefinitionData, ConfigurationCombinationData } from '../entities/configuration-definition.entity';
import { DependencyResolutionPolicy } from './dependency-resolution.policy';

export interface ValidationFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ConfigurationValidationResult {
  valid: boolean;
  errors: ValidationFieldError[];
}

export class ConfigurationValidationPolicy {
  /**
   * Validates a submitted configuration against a ConfigurationDefinition.
   *
   * Steps:
   * 1. Verify the selection matches an explicitly defined ConfigurationCombination
   * 2. Verify the matched combination is active
   * 3. Evaluate all dependency rules via DependencyResolutionPolicy
   * 4. Evaluate all constraint rules
   * 5. Return structured validation result
   */
  static validate(
    selections: Record<string, string[]>,
    definition: ConfigurationDefinitionData
  ): ConfigurationValidationResult {
    const errors: ValidationFieldError[] = [];

    // Step 1: Find matching combination
    const matchResult = this.findMatchingCombination(selections, definition);
    if (!matchResult.matches) {
      errors.push({
        field: 'selections',
        code: 'NO_MATCHING_COMBINATION',
        message: `Submitted configuration does not match any explicitly defined combination. Unmatched selections: ${this.formatUnmatchedSelections(selections)}`,
      });
      return { valid: false, errors };
    }

    // Step 2: Check if the combination is active
    if (matchResult.combination && !matchResult.combination.active) {
      errors.push({
        field: 'combination',
        code: 'INACTIVE_COMBINATION',
        message: 'The matching configuration combination is inactive.',
      });
    }

    // Step 3: Evaluate dependencies
    const depResult = DependencyResolutionPolicy.resolve(selections, definition);
    for (const conflict of depResult.conflicts) {
      errors.push({
        field: 'dependency',
        code: conflict.code,
        message: conflict.message,
      });
    }

    // Step 4: Evaluate constraints
    const constraintErrors = this.evaluateConstraints(selections, definition);
    errors.push(...constraintErrors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static findMatchingCombination(
    selections: Record<string, string[]>,
    definition: ConfigurationDefinitionData
  ): { matches: boolean; combination: ConfigurationCombinationData | null } {
    // Build a lookup map from optionId → normalizedValue
    const optionMap = new Map<string, string>();
    for (const opt of definition.options) {
      optionMap.set(opt.id, opt.normalizedValue);
    }

    // Resolve submitted selections to normalized values
    const normalizedSelections: Record<string, string[]> = {};
    for (const [dimId, optionIds] of Object.entries(selections)) {
      normalizedSelections[dimId] = optionIds.map(id => optionMap.get(id) ?? id);
    }

    // Compare against each combination's option selections
    for (const combo of definition.combinations) {
      const comboNormalized: Record<string, string[]> = {};
      for (const [dimId, optionIds] of Object.entries(combo.optionSelections)) {
        comboNormalized[dimId] = optionIds.map(id => optionMap.get(id) ?? id);
      }
      if (this.selectionsEqual(normalizedSelections, comboNormalized)) {
        return { matches: true, combination: combo };
      }
    }
    return { matches: false, combination: null };
  }

  private static selectionsEqual(
    a: Record<string, string[]>,
    b: Record<string, string[]>
  ): boolean {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i++) {
      if (aKeys[i] !== bKeys[i]) return false;
      const aVals = [...a[aKeys[i]]].sort();
      const bVals = [...b[bKeys[i]]].sort();
      if (aVals.length !== bVals.length) return false;
      for (let j = 0; j < aVals.length; j++) {
        if (aVals[j] !== bVals[j]) return false;
      }
    }
    return true;
  }

  private static evaluateConstraints(
    selections: Record<string, string[]>,
    definition: ConfigurationDefinitionData
  ): ValidationFieldError[] {
    const errors: ValidationFieldError[] = [];
    const allSelectedOptionIds = new Set<string>();
    for (const optionIds of Object.values(selections)) {
      for (const id of optionIds) {
        allSelectedOptionIds.add(id);
      }
    }

    for (const constraint of definition.constraints) {
      const sourceSelected = allSelectedOptionIds.has(constraint.sourceOptionId);
      const targetSelected = allSelectedOptionIds.has(constraint.targetOptionId);

      switch (constraint.type) {
        case 'requires':
          if (sourceSelected && !targetSelected) {
            errors.push({
              field: 'constraint',
              code: 'CONSTRAINT_VIOLATION',
              message: `Option ${constraint.sourceOptionId} requires option ${constraint.targetOptionId}`,
            });
          }
          break;
        case 'excludes':
          if (sourceSelected && targetSelected) {
            errors.push({
              field: 'constraint',
              code: 'CONSTRAINT_VIOLATION',
              message: `Option ${constraint.sourceOptionId} excludes option ${constraint.targetOptionId}`,
            });
          }
          break;
        case 'incompatible_with':
          if (sourceSelected && targetSelected) {
            errors.push({
              field: 'constraint',
              code: 'CONSTRAINT_VIOLATION',
              message: `Option ${constraint.sourceOptionId} is incompatible with option ${constraint.targetOptionId}`,
            });
          }
          break;
        case 'compatible_with':
          // Positive constraint — no violation if both selected
          break;
      }
    }
    return errors;
  }

  private static formatUnmatchedSelections(selections: Record<string, string[]>): string {
    return Object.entries(selections)
      .map(([dim, opts]) => `${dim}: [${opts.join(', ')}]`)
      .join('; ');
  }
}
