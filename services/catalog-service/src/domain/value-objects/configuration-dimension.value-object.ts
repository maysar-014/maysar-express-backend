// @ts-nocheck

export type SelectionType = 'selectable' | 'customer_defined';
export type SelectionMode = 'single' | 'multiple';

export interface ConfigurationDimensionData {
  id: string;
  configurationDefinitionId: string;
  name: string;
  selectionType: SelectionType;
  selectionMode: SelectionMode;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  sortOrder: number;
}

export class ConfigurationDimension {
  constructor(
    public readonly id: string,
    public readonly configurationDefinitionId: string,
    public readonly name: string,
    public readonly selectionType: SelectionType,
    public readonly selectionMode: SelectionMode,
    public readonly minSelections: number,
    public readonly maxSelections: number,
    public readonly required: boolean,
    public readonly sortOrder: number
  ) {
    if (!name.trim()) {
      throw new Error('ConfigurationDimension name cannot be empty');
    }
    if (minSelections < 0) {
      throw new Error('ConfigurationDimension minSelections cannot be negative');
    }
    if (maxSelections < minSelections) {
      throw new Error('ConfigurationDimension maxSelections must be >= minSelections');
    }
  }

  isSelectable(): boolean {
    return this.selectionType === 'selectable';
  }

  isCustomerDefined(): boolean {
    return this.selectionType === 'customer_defined';
  }

  isRequired(): boolean {
    return this.required;
  }

  toJSON(): ConfigurationDimensionData {
    return {
      id: this.id,
      configurationDefinitionId: this.configurationDefinitionId,
      name: this.name,
      selectionType: this.selectionType,
      selectionMode: this.selectionMode,
      minSelections: this.minSelections,
      maxSelections: this.maxSelections,
      required: this.required,
      sortOrder: this.sortOrder,
    };
  }

  static fromJSON(data: ConfigurationDimensionData): ConfigurationDimension {
    return new ConfigurationDimension(
      data.id,
      data.configurationDefinitionId,
      data.name,
      data.selectionType,
      data.selectionMode,
      data.minSelections,
      data.maxSelections,
      data.required,
      data.sortOrder
    );
  }
}
