/**
 * Load Category Attributes Use Case
 * Fetches category attribute schema for seller form population
 */

import { CategoryAttributeSchemaDto } from '../dto/product.dto';

export interface ILoadCategoryAttributesRepository {
  findByCategory(categoryId: string): Promise<any[]>;
}

export interface ICategoryRepository {
  findById(categoryId: string): Promise<any | null>;
}

export class LoadCategoryAttributesUseCase {
  constructor(
    private readonly categoryAttributeRepository: ILoadCategoryAttributesRepository,
    private readonly categoryRepository: ICategoryRepository
  ) {}

  async execute(categoryId: string): Promise<CategoryAttributeSchemaDto> {
    // Verify category exists
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    // Fetch attributes for category
    const attributes = await this.categoryAttributeRepository.findByCategory(categoryId);

    // Map to DTO
    return {
      categoryId,
      categoryName: category.name,
      categorySlug: category.slug,
      attributes: attributes.map(attr => ({
        id: attr.id,
        name: attr.name,
        displayLabel: attr.displayLabel,
        type: attr.type,
        isRequired: attr.isRequired,
        options: attr.options ? (typeof attr.options === 'string' ? JSON.parse(attr.options) : attr.options) : undefined,
        placeholder: attr.placeholder,
      })),
    };
  }
}
