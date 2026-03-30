/**
 * Transaction Manager
 * Manages database transactions
 */

export class TransactionManager {
  private transactionDepth = 0;

  async begin(): Promise<void> {
    this.transactionDepth += 1;
  }

  async commit(): Promise<void> {
    if (this.transactionDepth > 0) {
      this.transactionDepth -= 1;
    }
  }

  async rollback(): Promise<void> {
    if (this.transactionDepth > 0) {
      this.transactionDepth -= 1;
    }
  }

  async execute<T>(operation: () => Promise<T> | T): Promise<T> {
    await this.begin();

    try {
      const result = await operation();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}
