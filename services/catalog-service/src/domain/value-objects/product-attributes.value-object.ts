/**
 * Product Attributes Value Objects
 * Domain-specific types for structured product attributes
 */

import { DomainError } from '../errors/domain.error';

export interface CategoryAttributeSchema {
  id: string;
  name: string;
  displayLabel: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN';
  options?: string[];
  isRequired: boolean;
  placeholder?: string;
}

export class StructuredProductAttributes {
  private readonly attributes: Map<string, string>;
  private readonly schema: Map<string, CategoryAttributeSchema>;

  private constructor(
    attributes: Record<string, string>,
    schema: CategoryAttributeSchema[]
  ) {
    this.attributes = new Map(Object.entries(attributes));
    this.schema = new Map(schema.map(s => [s.name, s]));
  }

  static create(
    attributes: Record<string, string>,
    schema: CategoryAttributeSchema[]
  ): StructuredProductAttributes {
    // Validate required attributes
    const missingRequired = schema
      .filter(s => s.isRequired)
      .filter(s => !attributes[s.name] || attributes[s.name].trim() === '')
      .map(s => s.displayLabel);

    if (missingRequired.length > 0) {
      throw new DomainError(
        `Missing required attributes: ${missingRequired.join(', ')}`,
        'MISSING_REQUIRED_ATTRIBUTES'
      );
    }

    // Validate attribute types
    for (const [key, value] of Object.entries(attributes)) {
      const schemaAttr = schema.find(s => s.name === key);
      if (schemaAttr) {
        StructuredProductAttributes.validateAttributeType(value, schemaAttr);
      }
    }

    return new StructuredProductAttributes(attributes, schema);
  }

  private static validateAttributeType(
    value: string,
    schema: CategoryAttributeSchema
  ): void {
    switch (schema.type) {
      case 'NUMBER':
        if (isNaN(Number(value))) {
          throw new DomainError(
            `${schema.displayLabel} must be a number`,
            'INVALID_ATTRIBUTE_TYPE'
          );
        }
        break;
      case 'BOOLEAN':
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
          throw new DomainError(
            `${schema.displayLabel} must be a boolean`,
            'INVALID_ATTRIBUTE_TYPE'
          );
        }
        break;
      case 'SELECT':
        if (schema.options && !schema.options.includes(value)) {
          throw new DomainError(
            `${schema.displayLabel} must be one of: ${schema.options.join(', ')}`,
            'INVALID_ATTRIBUTE_VALUE'
          );
        }
        break;
      case 'TEXT':
        if (value.length > 500) {
          throw new DomainError(
            `${schema.displayLabel} must be 500 characters or less`,
            'ATTRIBUTE_TOO_LONG'
          );
        }
        break;
    }
  }

  get(name: string): string | undefined {
    return this.attributes.get(name);
  }

  getAll(): Record<string, string> {
    return Object.fromEntries(this.attributes);
  }

  getKeyAttribute(): string {
    // Return first SELECT type attribute or first required attribute
    const selectAttr = Array.from(this.schema.values()).find(s => s.type === 'SELECT');
    if (selectAttr && this.attributes.has(selectAttr.name)) {
      return this.attributes.get(selectAttr.name) || '';
    }

    const requiredAttr = Array.from(this.schema.values()).find(s => s.isRequired);
    if (requiredAttr && this.attributes.has(requiredAttr.name)) {
      return this.attributes.get(requiredAttr.name) || '';
    }

    return '';
  }

  toJSON(): Record<string, string> {
    return this.getAll();
  }
}
