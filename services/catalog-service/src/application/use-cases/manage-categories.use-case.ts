export interface ManagedCategoryRecord {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  parentId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CategorySummaryDto {
  id: string;
  label: string;
  icon: string | null;
}

export interface CategoryAdminDto extends CategorySummaryDto {
  slug: string;
  description: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface CreateCategoryRequest {
  label: string;
  icon?: string | null;
  description?: string | null;
  parentId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  slug?: string;
}

export interface UpdateCategoryRequest {
  label?: string;
  icon?: string | null;
  description?: string | null;
  parentId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  slug?: string;
}

interface CategoryRepositoryLike {
  save(category: Record<string, unknown>): Promise<ManagedCategoryRecord>;
  findById(id: string): Promise<ManagedCategoryRecord | null>;
  findAll(): Promise<ManagedCategoryRecord[]>;
  findBySlug(slug: string): Promise<ManagedCategoryRecord | null>;
  findSubcategories(parentId: string): Promise<ManagedCategoryRecord[]>;
  update(id: string, updates: Record<string, unknown>): Promise<ManagedCategoryRecord>;
  delete(id: string): Promise<boolean>;
}

interface ProductRepositoryLike {
  findByCategory(categoryId: string): Promise<Array<{ id?: string }>>;
}

export class CategoryValidationError extends Error {}
export class CategoryNotFoundError extends Error {}
export class CategoryConflictError extends Error {}
export class CategoryDeletionBlockedError extends Error {}

const normalizeNullableText = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toSlug = (value: string): string => value
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]/g, '')
  .replace(/_/g, '-')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 255);

const mapCategory = (category: ManagedCategoryRecord): CategoryAdminDto => ({
  id: category.id,
  label: category.name,
  icon: category.imageUrl ?? null,
  slug: category.slug,
  description: category.description ?? null,
  parentId: category.parentId ?? null,
  displayOrder: category.displayOrder ?? 0,
  isActive: category.isActive ?? true,
});

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepositoryLike) {}

  async execute(includeInactive: boolean = false): Promise<CategorySummaryDto[]> {
    const categories = await this.categoryRepository.findAll();

    return categories
      .filter((category) => includeInactive || category.isActive !== false)
      .sort((left, right) => {
        const orderDifference = (left.displayOrder ?? 0) - (right.displayOrder ?? 0);
        return orderDifference !== 0 ? orderDifference : left.name.localeCompare(right.name);
      })
      .map((category) => ({
        id: category.id,
        label: category.name,
        icon: category.imageUrl ?? null,
      }));
  }
}

export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepositoryLike) {}

  async execute(request: CreateCategoryRequest): Promise<CategoryAdminDto> {
    const label = request.label?.trim();
    if (!label) {
      throw new CategoryValidationError('Category label is required');
    }

    const slug = toSlug(request.slug || label);
    if (!slug) {
      throw new CategoryValidationError('Category slug cannot be empty');
    }

    const existingCategory = await this.categoryRepository.findBySlug(slug);
    if (existingCategory) {
      throw new CategoryConflictError(`Category slug already exists: ${slug}`);
    }

    if (request.parentId) {
      const parent = await this.categoryRepository.findById(request.parentId);
      if (!parent) {
        throw new CategoryNotFoundError(`Parent category not found: ${request.parentId}`);
      }
    }

    const category = await this.categoryRepository.save({
      name: label,
      slug,
      imageUrl: normalizeNullableText(request.icon) ?? null,
      description: normalizeNullableText(request.description) ?? null,
      parentId: request.parentId ?? null,
      displayOrder: request.displayOrder ?? 0,
      isActive: request.isActive ?? true,
    });

    return mapCategory(category);
  }
}

export class UpdateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepositoryLike) {}

  async execute(categoryId: string, request: UpdateCategoryRequest): Promise<CategoryAdminDto> {
    const existingCategory = await this.categoryRepository.findById(categoryId);
    if (!existingCategory) {
      throw new CategoryNotFoundError(`Category not found: ${categoryId}`);
    }

    if (request.parentId === categoryId) {
      throw new CategoryConflictError('Category cannot be its own parent');
    }

    if (request.parentId) {
      const parent = await this.categoryRepository.findById(request.parentId);
      if (!parent) {
        throw new CategoryNotFoundError(`Parent category not found: ${request.parentId}`);
      }
    }

    let nextSlug = existingCategory.slug;
    if (request.slug !== undefined) {
      nextSlug = toSlug(request.slug);
    } else if (request.label !== undefined) {
      const nextLabel = request.label.trim();
      if (!nextLabel) {
        throw new CategoryValidationError('Category label is required');
      }
      nextSlug = toSlug(nextLabel);
    }

    if (!nextSlug) {
      throw new CategoryValidationError('Category slug cannot be empty');
    }

    if (nextSlug !== existingCategory.slug) {
      const conflictingCategory = await this.categoryRepository.findBySlug(nextSlug);
      if (conflictingCategory && conflictingCategory.id !== categoryId) {
        throw new CategoryConflictError(`Category slug already exists: ${nextSlug}`);
      }
    }

    const updates: Record<string, unknown> = {};
    if (request.label !== undefined) {
      const label = request.label.trim();
      if (!label) {
        throw new CategoryValidationError('Category label is required');
      }
      updates.name = label;
      updates.slug = nextSlug;
    } else if (request.slug !== undefined) {
      updates.slug = nextSlug;
    }

    if (request.icon !== undefined) {
      updates.imageUrl = normalizeNullableText(request.icon) ?? null;
    }

    if (request.description !== undefined) {
      updates.description = normalizeNullableText(request.description) ?? null;
    }

    if (request.parentId !== undefined) {
      updates.parentId = request.parentId;
    }

    if (request.displayOrder !== undefined) {
      updates.displayOrder = request.displayOrder;
    }

    if (request.isActive !== undefined) {
      updates.isActive = request.isActive;
    }

    const updatedCategory = await this.categoryRepository.update(categoryId, updates);
    return mapCategory(updatedCategory);
  }
}

export class DeleteCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepositoryLike,
    private readonly productRepository: ProductRepositoryLike
  ) {}

  async execute(categoryId: string): Promise<{ categoryId: string; deleted: boolean }> {
    const existingCategory = await this.categoryRepository.findById(categoryId);
    if (!existingCategory) {
      throw new CategoryNotFoundError(`Category not found: ${categoryId}`);
    }

    const subcategories = await this.categoryRepository.findSubcategories(categoryId);
    if (subcategories.length > 0) {
      throw new CategoryDeletionBlockedError('Remove or reassign subcategories before deleting this category');
    }

    const products = await this.productRepository.findByCategory(categoryId);
    if (products.length > 0) {
      throw new CategoryDeletionBlockedError('Remove or reassign products before deleting this category');
    }

    await this.categoryRepository.delete(categoryId);
    return { categoryId, deleted: true };
  }
}
