/**
 * Prisma Product Attribute Repository
 * Infrastructure layer implementation for product attributes
 */

import { PrismaClient } from '@prisma/client';

export interface IProductAttributeRepository {
  saveAll(productId: string, attributes: Array<{ attributeId: string; value: string }>): Promise<void>;
  findByProduct(productId: string): Promise<any[]>;
  deleteByProduct(productId: string): Promise<number>;
}

export class PrismaProductAttributeRepository implements IProductAttributeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveAll(
    productId: string,
    attributes: Array<{ attributeId: string; value: string }>
  ): Promise<void> {
    if (attributes.length === 0) {
      return;
    }

    // Delete existing attributes for this product
    await this.prisma.productAttribute.deleteMany({
      where: { productId },
    });

    // Create new attributes
    await this.prisma.productAttribute.createMany({
      data: attributes.map(attr => ({
        id: this.generateId(),
        productId,
        attributeId: attr.attributeId,
        value: attr.value,
        createdAt: new Date(),
      })),
    });
  }

  async findByProduct(productId: string): Promise<any[]> {
    const attributes = await this.prisma.productAttribute.findMany({
      where: { productId },
      include: {
        attribute: true,
      },
    });

    return attributes;
  }

  async deleteByProduct(productId: string): Promise<number> {
    const result = await this.prisma.productAttribute.deleteMany({
      where: { productId },
    });

    return result.count;
  }

  async findByProductAndAttribute(productId: string, attributeId: string): Promise<any | null> {
    const attribute = await this.prisma.productAttribute.findFirst({
      where: {
        productId,
        attributeId,
      },
    });

    return attribute;
  }

  private generateId(): string {
    return require('uuid').v4();
  }
}
