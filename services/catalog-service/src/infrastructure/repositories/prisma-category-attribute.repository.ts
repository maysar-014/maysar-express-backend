/**
 * Prisma Category Attribute Repository
 * Infrastructure layer implementation for category attributes
 */

import { PrismaClient } from '@prisma/client';

export interface ICategoryAttributeRepository {
  findByCategory(categoryId: string): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  save(attribute: any): Promise<void>;
}

export class PrismaCategoryAttributeRepository implements ICategoryAttributeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCategory(categoryId: string): Promise<any[]> {
    const attributes = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      orderBy: { displayOrder: 'asc' },
    });

    return attributes;
  }

  async findById(id: string): Promise<any | null> {
    const attribute = await this.prisma.categoryAttribute.findUnique({
      where: { id },
    });

    return attribute;
  }

  async save(attribute: any): Promise<void> {
    await this.prisma.categoryAttribute.upsert({
      where: { id: attribute.id || '' },
      update: {
        name: attribute.name,
        displayLabel: attribute.displayLabel,
        type: attribute.type,
        options: attribute.options,
        isRequired: attribute.isRequired,
        displayOrder: attribute.displayOrder,
        placeholder: attribute.placeholder,
      },
      create: {
        id: attribute.id,
        categoryId: attribute.categoryId,
        name: attribute.name,
        displayLabel: attribute.displayLabel,
        type: attribute.type,
        options: attribute.options,
        isRequired: attribute.isRequired,
        displayOrder: attribute.displayOrder,
        placeholder: attribute.placeholder,
      },
    });
  }

  async findByCategoryAndName(categoryId: string, name: string): Promise<any | null> {
    const attribute = await this.prisma.categoryAttribute.findFirst({
      where: {
        categoryId,
        name,
      },
    });

    return attribute;
  }

  async deleteByCategory(categoryId: string): Promise<number> {
    const result = await this.prisma.categoryAttribute.deleteMany({
      where: { categoryId },
    });

    return result.count;
  }
}
