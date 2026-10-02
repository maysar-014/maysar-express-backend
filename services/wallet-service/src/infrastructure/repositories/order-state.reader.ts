import { PrismaClient } from '@prisma/client';

/**
 * Read-only view of order status for the hold reconciliation job.
 *
 * The monolith runs a single Postgres instance and all services share it, so the
 * reconciliation job can classify a hold by looking up the order it secures.
 * This mirrors the existing precedent in order-service's
 * `CatalogProductRepository`, which reads `products` for a cross-service
 * consistency check. Strictly read-only: no order is ever mutated from the
 * wallet service.
 *
 * Typed loosely on purpose — `prisma` is a locally narrowed client and the
 * wallet module should not gain a hard compile-time dependency on the order
 * model.
 */
export class OrderStateReader {
    constructor(private readonly prisma: PrismaClient) { }

    async findMany(ids: string[]): Promise<Array<{ id: string; status: string }>> {
        if (!ids.length) return [];
        const delegate = (this.prisma as unknown as {
            order_Order?: {
                findMany(args: unknown): Promise<Array<{ id: string; status: string }>>;
            };
        }).order_Order;

        // Guarded: if the order model is unavailable in this deployment the job
        // must no-op safely rather than crash the wallet service.
        if (!delegate?.findMany) return [];

        return delegate.findMany({
            where: { id: { in: ids } },
            select: { id: true, status: true },
        });
    }
}
