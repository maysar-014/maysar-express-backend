export interface DeviceReputation {
    riskScore: number;
}

export interface UserBehavior {
    activeHours: number[];
    paymentMethods: string[];
}

export interface UserLocation {
    country: string;
    city: string;
    lat: number;
    lng: number;
    timestamp: Date;
}

export interface UserProfile {
    averageTransaction: number;
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

export interface FraudAssessment {
    transactionId: string;
    riskScore: number;
    riskLevel: string;
    recommendation: string;
    confidence: number;
    flags: any[];
    processingTime: number;
}

export interface IFraudRepository {
    saveAssessment(assessment: FraudAssessment): Promise<void>;
    getRecentTransactions(userId: string, windowSeconds: number): Promise<TransactionData[]>;
    getUserProfile(userId: string): Promise<UserProfile>;
    getUserLocationHistory(userId: string): Promise<UserLocation[]>;
    getDeviceHistory(userId: string): Promise<string[]>;
    getDeviceReputation(fingerprint: string): Promise<DeviceReputation>;
    getUserBehavior(userId: string): Promise<UserBehavior>;

    // Legacy support (to be refactored)
    saveResult(paymentId: string, result: any): Promise<void>;
    findResultByPaymentId(paymentId: string): Promise<any>;
}
