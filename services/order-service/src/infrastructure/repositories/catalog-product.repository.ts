import { databaseManager } from '../../config/database.config';

/**
 * Read-only access to the shared catalog_products table for order-service checks.
 *
 * The monolith shares one Postgres database and one global Prisma client, so the
 * order-service can enforce catalog-level rules (like COD acceptance) directly
 * without an HTTP round-trip to the catalog-service.
 */
export class CatalogProductRepository {
  /**
   * Returns the subset of `productIds` whose catalog record does NOT accept COD
   * (codAccepted !== true).
   *
   * Products missing from the catalog are treated as non-COD (fail closed), so a
   * COD order can never be created for an unknown product.
   */
  async findNonCodProductIds(productIds: string[]): Promise<string[]> {
    const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
    if (uniqueIds.length === 0) return [];

    const prisma = databaseManager.getPrisma() as unknown as {
      product: {
        findMany(args: {
          where: { id: { in: string[] } };
          select: { id: true; codAccepted: true };
        }): Promise<Array<{ id: string; codAccepted: boolean }>>;
      };
    };

    const rows = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, codAccepted: true },
    });

    const codAcceptedById = new Map<string, boolean>(
      rows.map((row) => [row.id, row.codAccepted === true])
    );

    return uniqueIds.filter((id) => codAcceptedById.get(id) !== true);
  }
}
