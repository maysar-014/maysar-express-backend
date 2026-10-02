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

  /**
   * Resolves the seller/supplier location for each product, from the catalog
   * record's own supplier location (not from anything the client supplies).
   *
   * COD geographic eligibility compares the buyer's delivery city against the
   * seller's city. That comparison is a risk control, so the seller side must be
   * server-derived: accepting a client-supplied `sellerAddress` would let a
   * caller choose its own "seller city" and defeat the same-city rule.
   *
   * Products without a supplier location resolve to `null`; callers must treat
   * that as "unknown", never as "same city".
   */
  async findSupplierLocations(
    productIds: string[]
  ): Promise<Map<string, { city: string; region: string | null; country: string | null }>> {
    const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
    const locations = new Map<string, { city: string; region: string | null; country: string | null }>();
    if (uniqueIds.length === 0) return locations;

    const prisma = databaseManager.getPrisma() as unknown as {
      product: {
        findMany(args: {
          where: { id: { in: string[] } };
          select: {
            id: true;
            supplierLocationRef: {
              select: { city: true; region: true; country: true };
            } | null;
          };
        }): Promise<Array<{
          id: string;
          supplierLocationRef: { city: string; region: string | null; country: string | null } | null;
        }>>;
      };
    };

    const rows = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        supplierLocationRef: { select: { city: true, region: true, country: true } },
      },
    });

    for (const row of rows) {
      if (row.supplierLocationRef?.city) {
        locations.set(row.id, {
          city: row.supplierLocationRef.city,
          region: row.supplierLocationRef.region,
          country: row.supplierLocationRef.country,
        });
      }
    }

    return locations;
  }
}
