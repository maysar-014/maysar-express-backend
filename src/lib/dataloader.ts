/**
 * Maysar Engineering — DataLoader for N+1 Query Prevention
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 10.3: N+1 query patterns shall be identified and eliminated where unnecessary
 *   - Article 7: Resource Efficiency Doctrine
 *   - Article 21: Performance Measurement
 * 
 * Implements DataLoader pattern for batch loading related records.
 * Instead of making N individual queries for related records, DataLoader batches
 * all IDs into a single query per tick, eliminating N+1 query patterns.
 * 
 * Usage:
 *   const loaders = createLoaders();
 *   const user = await loaders.userLoader.load(userId);
 *   const users = await Promise.all(ids.map(id => loaders.userLoader.load(id)));
 */

import DataLoader from 'dataloader';
import { prisma } from '../config/prisma';

/**
 * Create per-request DataLoader instances.
 * 
 * Each request gets its own DataLoader instances to avoid cross-request
 * cache leaks. Loaders are automatically batched per event loop tick.
 */
export function createLoaders() {
  /**
   * Batch load users by IDs.
   * Instead of N queries for N users, makes 1 query with WHERE id IN (...)
   */
  const userLoader = new DataLoader<string, any>(
    async (userIds: readonly string[]) => {
      const users = await prisma.user_User.findMany({
        where: { id: { in: userIds as string[] } },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      return userIds.map((id) => userMap.get(id));
    },
    { cache: true }
  );

  /**
   * Batch load products by IDs.
   */
  const productLoader = new DataLoader<string, any>(
    async (productIds: readonly string[]) => {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds as string[] } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      return productIds.map((id) => productMap.get(id));
    },
    { cache: true }
  );

  /**
   * Batch load orders by IDs.
   */
  const orderLoader = new DataLoader<string, any>(
    async (orderIds: readonly string[]) => {
      const orders = await prisma.order_Order.findMany({
        where: { id: { in: orderIds as string[] } },
      });
      const orderMap = new Map(orders.map((o) => [o.id, o]));
      return orderIds.map((id) => orderMap.get(id));
    },
    { cache: true }
  );

  /**
   * Batch load wallets by IDs.
   */
  const walletLoader = new DataLoader<string, any>(
    async (walletIds: readonly string[]) => {
      const wallets = await prisma.wallet_Wallet.findMany({
        where: { id: { in: walletIds as string[] } },
      });
      const walletMap = new Map(wallets.map((w) => [w.id, w]));
      return walletIds.map((id) => walletMap.get(id));
    },
    { cache: true }
  );

  /**
   * Batch load payments by IDs.
   */
  const paymentLoader = new DataLoader<string, any>(
    async (paymentIds: readonly string[]) => {
      const payments = await prisma.payment_Payment.findMany({
        where: { id: { in: paymentIds as string[] } },
      });
      const paymentMap = new Map(payments.map((p) => [p.id, p]));
      return paymentIds.map((id) => paymentMap.get(id));
    },
    { cache: true }
  );

  return {
    userLoader,
    productLoader,
    orderLoader,
    walletLoader,
    paymentLoader,
  };
}
