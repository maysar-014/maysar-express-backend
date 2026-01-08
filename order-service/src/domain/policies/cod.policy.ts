export interface CODValidationResult {
  valid: boolean;
  errors: string[];
}

export class CODPolicy {
  private readonly MAX_COD_AMOUNT = 500000; // 500,000 TZS
  private readonly MIN_COD_AMOUNT = 1000;   // 1,000 TZS

  async validate(orderData: any): Promise<CODValidationResult> {
    const errors: string[] = [];

    if (orderData.paymentMethod !== 'COD') {
      return { valid: true, errors: [] };
    }

    // Amount limits
    if (orderData.totalAmount > this.MAX_COD_AMOUNT) {
      errors.push(`COD amount exceeds maximum limit of ${this.MAX_COD_AMOUNT} TZS`);
    }

    if (orderData.totalAmount < this.MIN_COD_AMOUNT) {
      errors.push(`COD amount below minimum limit of ${this.MIN_COD_AMOUNT} TZS`);
    }

    // Buyer verification
    const buyerVerified = await this.isBuyerVerified(orderData.buyerId);
    if (!buyerVerified) {
      errors.push('Buyer must be verified for COD orders');
    }

    // Delivery area check
    const deliverySupported = await this.isCODSupportedInArea(orderData.deliveryAddress);
    if (!deliverySupported) {
      errors.push('COD not supported in delivery area');
    }

    return { valid: errors.length === 0, errors };
  }

  private async isBuyerVerified(buyerId: string): Promise<boolean> {
    // Integration with auth service to check buyer verification
    return true; // Placeholder
  }

  private async isCODSupportedInArea(address: string): Promise<boolean> {
    // Check if COD is supported in delivery area
    return true; // Placeholder
  }
}