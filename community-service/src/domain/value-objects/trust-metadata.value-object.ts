/**
 * Trust metadata value object representing a user's trustworthiness in the marketplace
 */
export class TrustMetadata {
  private constructor(
    private readonly _isVerified: boolean,
    private readonly _ratingScore: number,
    private readonly _completedOrders: number,
    private readonly _successfulCODCount: number,
    private readonly _disputeRate: number,
    private readonly _lastUpdated: Date
  ) {
    this.validateRatingScore(_ratingScore);
    this.validateCounts(_completedOrders, _successfulCODCount);
    this.validateDisputeRate(_disputeRate);
  }

  // Factory methods
  static create(params: {
    isVerified?: boolean;
    ratingScore?: number;
    completedOrders?: number;
    successfulCODCount?: number;
    disputeRate?: number;
  }): TrustMetadata {
    return new TrustMetadata(
      params.isVerified ?? false,
      params.ratingScore ?? 0,
      params.completedOrders ?? 0,
      params.successfulCODCount ?? 0,
      params.disputeRate ?? 0,
      new Date()
    );
  }

  static createDefault(): TrustMetadata {
    return new TrustMetadata(false, 0, 0, 0, 0, new Date());
  }

  static createVerified(params: {
    ratingScore: number;
    completedOrders: number;
    successfulCODCount: number;
    disputeRate: number;
  }): TrustMetadata {
    return new TrustMetadata(
      true,
      params.ratingScore,
      params.completedOrders,
      params.successfulCODCount,
      params.disputeRate,
      new Date()
    );
  }

  // Getters
  get isVerified(): boolean {
    return this._isVerified;
  }

  get ratingScore(): number {
    return this._ratingScore;
  }

  get completedOrders(): number {
    return this._completedOrders;
  }

  get successfulCODCount(): number {
    return this._successfulCODCount;
  }

  get disputeRate(): number {
    return this._disputeRate;
  }

  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  // Business methods
  updateWithNewOrder(successful: boolean): TrustMetadata {
    const newCompletedOrders = this._completedOrders + 1;
    const newSuccessfulCODCount = successful ? this._successfulCODCount + 1 : this._successfulCODCount;
    const newDisputeRate = newCompletedOrders > 0 ? (newCompletedOrders - newSuccessfulCODCount) / newCompletedOrders : 0;

    return new TrustMetadata(
      this._isVerified,
      this.calculateNewRating(successful),
      newCompletedOrders,
      newSuccessfulCODCount,
      newDisputeRate,
      new Date()
    );
  }

  updateRating(newRating: number): TrustMetadata {
    return new TrustMetadata(
      this._isVerified,
      newRating,
      this._completedOrders,
      this._successfulCODCount,
      this._disputeRate,
      new Date()
    );
  }

  verify(): TrustMetadata {
    return new TrustMetadata(
      true,
      this._ratingScore,
      this._completedOrders,
      this._successfulCODCount,
      this._disputeRate,
      new Date()
    );
  }

  // Business rules and calculations
  isEligibleForCOD(): boolean {
    return this._isVerified &&
           this._ratingScore >= 4.0 &&
           this._disputeRate <= 0.05 &&
           this._completedOrders >= 10;
  }

  getTrustLevel(): 'low' | 'medium' | 'high' | 'elite' {
    if (this._ratingScore >= 4.8 && this._disputeRate <= 0.02 && this._completedOrders >= 100) {
      return 'elite';
    }
    if (this._ratingScore >= 4.5 && this._disputeRate <= 0.05 && this._completedOrders >= 50) {
      return 'high';
    }
    if (this._ratingScore >= 4.0 && this._disputeRate <= 0.10 && this._completedOrders >= 20) {
      return 'medium';
    }
    return 'low';
  }

  getCODLimit(): number {
    const baseLimit = 1000; // Base COD limit in currency units

    switch (this.getTrustLevel()) {
      case 'elite':
        return baseLimit * 5; // 5000
      case 'high':
        return baseLimit * 3; // 3000
      case 'medium':
        return baseLimit * 2; // 2000
      default:
        return baseLimit; // 1000
    }
  }

  // Private validation methods
  private validateRatingScore(score: number): void {
    if (score < 0 || score > 5) {
      throw new Error('Rating score must be between 0 and 5');
    }
  }

  private validateCounts(completedOrders: number, successfulCODCount: number): void {
    if (completedOrders < 0 || successfulCODCount < 0) {
      throw new Error('Order counts cannot be negative');
    }
    if (successfulCODCount > completedOrders) {
      throw new Error('Successful COD count cannot exceed completed orders');
    }
  }

  private validateDisputeRate(rate: number): void {
    if (rate < 0 || rate > 1) {
      throw new Error('Dispute rate must be between 0 and 1');
    }
  }

  private calculateNewRating(orderSuccessful: boolean): number {
    // Simple weighted average calculation
    // New rating = (old_rating * completed_orders + new_rating) / (completed_orders + 1)
    const newOrderRating = orderSuccessful ? 5.0 : 1.0;
    const totalScore = (this._ratingScore * this._completedOrders) + newOrderRating;
    const totalOrders = this._completedOrders + 1;

    return totalScore / totalOrders;
  }

  // Equality and serialization
  equals(other: TrustMetadata): boolean {
    return this._isVerified === other._isVerified &&
           this._ratingScore === other._ratingScore &&
           this._completedOrders === other._completedOrders &&
           this._successfulCODCount === other._successfulCODCount &&
           this._disputeRate === other._disputeRate;
  }

  toJSON() {
    return {
      isVerified: this._isVerified,
      ratingScore: this._ratingScore,
      completedOrders: this._completedOrders,
      successfulCODCount: this._successfulCODCount,
      disputeRate: this._disputeRate,
      lastUpdated: this._lastUpdated.toISOString(),
      trustLevel: this.getTrustLevel(),
      codLimit: this.getCODLimit(),
      eligibleForCOD: this.isEligibleForCOD()
    };
  }
}
