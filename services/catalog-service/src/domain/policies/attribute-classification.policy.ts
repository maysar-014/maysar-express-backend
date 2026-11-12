import { CategoryAttributeSchema, AttributeClassification } from '../value-objects/product-attributes.value-object';

export interface ClassificationFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ClassificationFieldWarning {
  field: string;
  code: string;
  message: string;
}

export interface ClassificationValidationResult {
  valid: boolean;
  errors: ClassificationFieldError[];
  warnings: ClassificationFieldWarning[];
}

const VALID_CLASSIFICATIONS: AttributeClassification[] = [
  'descriptive',
  'filterable',
  'configurable',
  'operational',
];

/**
 * Domain policy enforcing attribute classification rules from constitution §4.2.
 *
 * Key principle: classification is never inferred from boolean flags.
 * `filterable=true` does NOT mean the attribute is `configurable`.
 */
export class AttributeClassificationPolicy {
  /**
   * Validates an array of CategoryAttributeSchema instances for classification compliance.
   *
   * Hard errors (valid = false):
   *   - MISSING_CLASSIFICATION: schema has no classification field
   *   - INVALID_CLASSIFICATION: classification value is not one of the four allowed
   *
   * Soft warnings (advisory only, do not affect validity):
   *   - FLAG_CLASSIFICATION_MISMATCH: classification suggests a role that contradicts a boolean flag
   *   - CONFIGURABLE_ALSO_FILTERABLE: classification='configurable' but filterable=true
   */
  static validate(schemas: CategoryAttributeSchema[]): ClassificationValidationResult {
    const errors: ClassificationFieldError[] = [];
    const warnings: ClassificationFieldWarning[] = [];

    for (const schema of schemas) {
      if (schema.classification === undefined || schema.classification === null) {
        errors.push({
          field: schema.name,
          code: 'MISSING_CLASSIFICATION',
          message: `Attribute "${schema.name}" has no classification. Every attribute must be classified as descriptive, filterable, configurable, or operational.`,
        });
        continue;
      }

      if (!VALID_CLASSIFICATIONS.includes(schema.classification)) {
        errors.push({
          field: schema.name,
          code: 'INVALID_CLASSIFICATION',
          message: `Attribute "${schema.name}" has invalid classification "${schema.classification}". Must be one of: descriptive, filterable, configurable, operational.`,
        });
        continue;
      }

      this.checkFlagConsistency(schema, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Returns the authoritative classification for a single attribute schema.
   * When the classification field is present, returns that value.
   * When absent, returns undefined — does NOT infer from boolean flags.
   */
  static classifyAttribute(schema: CategoryAttributeSchema): AttributeClassification | undefined {
    return schema.classification;
  }

  /**
   * Returns true if and only if the attribute's classification is 'configurable'.
   * This method checks the classification field only. It does NOT inspect
   * the filterable, searchable, comparable, or identityRelevant boolean flags.
   */
  static isConfigurable(schema: CategoryAttributeSchema): boolean {
    return schema.classification === 'configurable';
  }

  /**
   * Checks for advisory warnings where boolean flags and classification
   * may be inconsistent. These are soft advisories — they do not affect validity.
   */
  private static checkFlagConsistency(
    schema: CategoryAttributeSchema,
    warnings: ClassificationFieldWarning[],
  ): void {
    if (schema.classification === 'filterable' && schema.filterable === false) {
      warnings.push({
        field: schema.name,
        code: 'FLAG_CLASSIFICATION_MISMATCH',
        message: `Attribute "${schema.name}" is classified as filterable but the filterable flag is false.`,
      });
    }

    if (schema.classification === 'configurable' && schema.filterable === true) {
      warnings.push({
        field: schema.name,
        code: 'CONFIGURABLE_ALSO_FILTERABLE',
        message: `Attribute "${schema.name}" is classified as configurable but also marked filterable. This is allowed but may indicate a misconfiguration — filterable does not automatically mean configurable.`,
      });
    }
  }
}
