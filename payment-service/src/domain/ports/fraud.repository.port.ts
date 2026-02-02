import { FraudAssessment, TransactionData } from '../engines/fraud.engine';

export interface UserProfile {
    averageTransaction: number;
}

export interface UserLocation {
    country: string;
    city: string;
    lat: number;
    lng: number;
    timestamp: Date;
}

export interface DeviceReputation {
    riskScore: number;
}

export interface UserBehavior {
    activeHours: number[];
    paymentMethods: string[];
}

export interface IFraudRepository {
    saveAssessment(assessment: FraudAssessment): Promise<void>;
    getRecentTransactions(userId: string, windowSeconds: number): Promise<TransactionData[]>;
    getUserProfile(userId: string): Promise<UserProfile>;
    getUserLocationHistory(userId: string): Promise<UserLocation[]>;
    getDeviceHistory(userId: string): Promise<string[]>;
    getDeviceReputation(fingerprint: string): Promise<DeviceReputation>;
    getUserBehavior(userId: string): Promise<UserBehavior>;
}
