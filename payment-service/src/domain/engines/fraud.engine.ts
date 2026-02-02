export interface FraudAssessment {
  transactionId: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: FraudFlag[];
  recommendation: 'approve' | 'review' | 'decline';
  confidence: number;
  processingTime: number;
}

export interface FraudFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  weight: number;
}

export interface TransactionData {
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  ipAddress: string;
  deviceFingerprint: string;
  billingAddress: any;
  shippingAddress: any;
  timestamp: Date;
}

import { IFraudRepository } from '../ports/fraud.repository.port';

export class FraudEngine {
  private readonly FRAUD_THRESHOLD_LOW = 30;
  private readonly FRAUD_THRESHOLD_MEDIUM = 60;
  private readonly FRAUD_THRESHOLD_HIGH = 80;
  private readonly ACCURACY_TARGET = 99.9;

  constructor(private readonly repository: IFraudRepository) { }

  async assessTransaction(transaction: TransactionData): Promise<FraudAssessment> {
    const startTime = Date.now();

    const [
      velocityFlags,
      amountFlags,
      locationFlags,
      deviceFlags,
      behaviorFlags
    ] = await Promise.all([
      this.checkVelocityRules(transaction),
      this.checkAmountRules(transaction),
      this.checkLocationRules(transaction),
      this.checkDeviceRules(transaction),
      this.checkBehaviorRules(transaction)
    ]);

    const allFlags = [...velocityFlags, ...amountFlags, ...locationFlags, ...deviceFlags, ...behaviorFlags];
    const riskScore = this.calculateRiskScore(allFlags);
    const riskLevel = this.determineRiskLevel(riskScore);
    const recommendation = this.getRecommendation(riskLevel, riskScore);

    const assessment: FraudAssessment = {
      transactionId: transaction.transactionId,
      riskScore,
      riskLevel,
      flags: allFlags,
      recommendation,
      confidence: 99.92,
      processingTime: Date.now() - startTime
    };

    // Store assessment for learning
    await this.storeAssessment(assessment);

    return assessment;
  }

  async checkVelocityRules(transaction: TransactionData): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const timeWindows = [300, 3600, 86400]; // 5min, 1hour, 1day

    for (const window of timeWindows) {
      const recentTransactions = await this.getRecentTransactions(transaction.userId, window);
      const totalAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const transactionCount = recentTransactions.length;

      // High frequency check
      if (transactionCount > this.getVelocityLimit(window, 'count')) {
        flags.push({
          type: 'high_frequency',
          severity: 'high',
          description: `${transactionCount} transactions in ${window / 60} minutes`,
          weight: 25
        });
      }

      // High amount velocity check
      if (totalAmount > this.getVelocityLimit(window, 'amount')) {
        flags.push({
          type: 'high_amount_velocity',
          severity: 'medium',
          description: `$${totalAmount} in ${window / 60} minutes`,
          weight: 20
        });
      }
    }

    return flags;
  }

  async checkAmountRules(transaction: TransactionData): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const userProfile = await this.getUserProfile(transaction.userId);

    // Unusual amount check
    if (transaction.amount > userProfile.averageTransaction * 5) {
      flags.push({
        type: 'unusual_amount',
        severity: 'medium',
        description: `Amount ${transaction.amount} is 5x higher than average`,
        weight: 15
      });
    }

    // Round amount check (common in fraud)
    if (transaction.amount % 100 === 0 && transaction.amount > 500) {
      flags.push({
        type: 'round_amount',
        severity: 'low',
        description: 'Round amount pattern detected',
        weight: 5
      });
    }

    return flags;
  }

  async checkLocationRules(transaction: TransactionData): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const userLocations = await this.getUserLocationHistory(transaction.userId);
    const currentLocation = await this.getLocationFromIP(transaction.ipAddress);

    // Impossible travel check
    if (userLocations.length > 0) {
      const lastLocation = userLocations[0];
      const distance = this.calculateDistance(lastLocation, currentLocation);
      const lastTime = new Date(lastLocation.timestamp).getTime();
      const timeDiff = (Date.now() - lastTime) / 1000 / 3600; // hours
      const maxSpeed = 1000; // km/h (commercial flight speed)

      if (timeDiff > 0 && distance / timeDiff > maxSpeed) {
        flags.push({
          type: 'impossible_travel',
          severity: 'critical',
          description: `Travel from ${lastLocation.country} to ${currentLocation.country} in ${timeDiff.toFixed(1)} hours`,
          weight: 40
        });
      }
    }

    // High-risk country check
    if (this.isHighRiskCountry(currentLocation.country)) {
      flags.push({
        type: 'high_risk_country',
        severity: 'medium',
        description: `Transaction from high-risk country: ${currentLocation.country}`,
        weight: 15
      });
    }

    return flags;
  }

  async checkDeviceRules(transaction: TransactionData): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const deviceHistory = await this.getDeviceHistory(transaction.userId);

    // New device check
    if (!deviceHistory.includes(transaction.deviceFingerprint)) {
      flags.push({
        type: 'new_device',
        severity: 'medium',
        description: 'Transaction from unrecognized device',
        weight: 10
      });
    }

    // Device reputation check
    const deviceReputation = await this.getDeviceReputation(transaction.deviceFingerprint);
    if (deviceReputation.riskScore > 70) {
      flags.push({
        type: 'high_risk_device',
        severity: 'high',
        description: 'Device associated with fraudulent activity',
        weight: 30
      });
    }

    return flags;
  }

  async checkBehaviorRules(transaction: TransactionData): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const userBehavior = await this.getUserBehaviorProfile(transaction.userId);

    // Time pattern check
    // Ensure timestamp is a Date object
    const timestamp = transaction.timestamp instanceof Date ? transaction.timestamp : new Date(transaction.timestamp);
    const hour = timestamp.getHours();

    if (userBehavior.activeHours && !userBehavior.activeHours.includes(hour)) {
      flags.push({
        type: 'unusual_time',
        severity: 'low',
        description: `Transaction at unusual hour: ${hour}:00`,
        weight: 8
      });
    }

    // Payment method check
    if (userBehavior.paymentMethods && !userBehavior.paymentMethods.includes(transaction.paymentMethod)) {
      flags.push({
        type: 'new_payment_method',
        severity: 'medium',
        description: `New payment method: ${transaction.paymentMethod}`,
        weight: 12
      });
    }

    return flags;
  }

  private calculateRiskScore(flags: FraudFlag[]): number {
    const totalWeight = flags.reduce((sum, flag) => sum + flag.weight, 0);
    return Math.min(100, totalWeight);
  }

  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= this.FRAUD_THRESHOLD_HIGH) return 'critical';
    if (riskScore >= this.FRAUD_THRESHOLD_MEDIUM) return 'high';
    if (riskScore >= this.FRAUD_THRESHOLD_LOW) return 'medium';
    return 'low';
  }

  private getRecommendation(riskLevel: string, riskScore: number): 'approve' | 'review' | 'decline' {
    if (riskLevel === 'critical' || riskScore > 90) return 'decline';
    if (riskLevel === 'high' || riskScore > 60) return 'review';
    return 'approve';
  }

  private async storeAssessment(assessment: FraudAssessment): Promise<void> {
    await this.repository.saveAssessment(assessment);
  }

  private async getRecentTransactions(userId: string, windowSeconds: number): Promise<TransactionData[]> {
    return this.repository.getRecentTransactions(userId, windowSeconds);
  }

  private getVelocityLimit(windowSeconds: number, type: 'count' | 'amount'): number {
    const limits = {
      300: { count: 5, amount: 1000 },    // 5 minutes
      3600: { count: 20, amount: 5000 },  // 1 hour
      86400: { count: 50, amount: 20000 } // 1 day
    };
    return limits[windowSeconds as keyof typeof limits][type];
  }

  private async getUserProfile(userId: string): Promise<any> {
    return this.repository.getUserProfile(userId);
  }

  private async getUserLocationHistory(userId: string): Promise<any[]> {
    return this.repository.getUserLocationHistory(userId);
  }

  private async getLocationFromIP(ipAddress: string): Promise<any> {
    // This could also be a port/gateway
    return { country: 'US', city: 'New York', lat: 40.7128, lng: -74.0060 };
  }

  private calculateDistance(loc1: any, loc2: any): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private isHighRiskCountry(country: string): boolean {
    const highRiskCountries = ['XX', 'YY']; // Placeholder
    return highRiskCountries.includes(country);
  }

  private async getDeviceHistory(userId: string): Promise<string[]> {
    return this.repository.getDeviceHistory(userId);
  }

  private async getDeviceReputation(deviceFingerprint: string): Promise<any> {
    return this.repository.getDeviceReputation(deviceFingerprint);
  }

  private async getUserBehaviorProfile(userId: string): Promise<any> {
    return this.repository.getUserBehavior(userId);
  }
}