import { GeoPoint } from '../value-objects/geopoint.value-object';
import { Route } from '../entities/route.entity';
import { RouteStatus } from '../enums/route-status.enum';

// Domain Entities as defined in ports (for backward compatibility with use cases)

export interface Courier {
    id: string;
    name: string;
    phone: string;
    vehicle: {
        type: string;
        capacity: {
            maxWeight: number;
            maxVolume: number;
            maxItems: number;
        };
    };
    rating: number;
    completionRate: number;
    currentLocation: GeoPoint;
    isAvailable: boolean;
    trafficExperience: number;
}

export interface Delivery {
    id: string;
    orderId: string;
    courierId: string;
    status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
    pickupLocation: GeoPoint;
    deliveryLocation: GeoPoint;
    estimatedPickupTime: Date;
    actualPickupTime?: Date;
    estimatedDeliveryTime: Date;
    actualDeliveryTime?: Date;
    weight: number;
    priority: 'standard' | 'express' | 'urgent';
    specialRequirements?: string[];
    routeDistance: number;
    routeDuration: number;
    totalCost: number;

    // COD Specific Fields
    isCOD: boolean;
    codAmount?: number;
    codCurrency?: string;
    codCollected: boolean;
    codCollectedAt?: Date;
    codOtpVerified: boolean;
    otp?: string;
    otpExpiresAt?: Date;
    codProofGpsLat?: number;
    codProofGpsLng?: number;
    codProofTimestamp?: Date;
    buyerId?: string;
    sellerId?: string;
    codCommitmentHoldId?: string;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Interface for Courier Repository
 * Handles persistence and retrieval of courier data
 */
export interface ICourierRepository {
    /**
     * Finds couriers available within a certain radius of a location
     */
    findAvailableCouriers(location: GeoPoint, radius: number): Promise<Courier[]>;

    /**
     * Finds all available couriers
     */
    findAvailable(): Promise<Courier[]>;

    /**
     * Assigns a courier to a delivery
     */
    assignCourier(deliveryId: string, courierId: string): Promise<void>;

    /**
     * Finds a courier by their ID
     */
    findById(courierId: string): Promise<Courier | null>;

    /**
     * Gets a courier by their ID, throwing an error if not found
     */
    getCourierById(courierId: string): Promise<Courier>;

    /**
     * Updates a courier's current location
     */
    updateCourierLocation(courierId: string, location: GeoPoint): Promise<void>;

    /**
     * Updates a courier's availability status
     */
    updateCourierAvailability(courierId: string, isAvailable: boolean): Promise<void>;

    /**
     * Gets performance metrics for a courier
     */
    getCourierPerformance(courierId: string): Promise<{
        totalDeliveries: number;
        onTimeRate: number;
        averageRating: number;
    }>;
}

/**
 * Interface for Delivery Repository
 * Handles persistence and retrieval of delivery data
 */
export interface IDeliveryRepository {
    /**
     * Saves or updates a delivery
     */
    save(delivery: Delivery): Promise<void>;

    /**
     * Finds a delivery by its ID
     */
    findById(id: string): Promise<Delivery | null>;

    /**
     * Finds all deliveries assigned to a specific courier
     */
    findByCourierId(courierId: string): Promise<Delivery[]>;

    /**
     * Finds deliveries by their status
     */
    findByStatus(status: string): Promise<Delivery[]>;

    /**
     * Finds all deliveries within an optional time range
     */
    findAll(timeRange?: { start: Date; end: Date }): Promise<Delivery[]>;

    /**
     * Updates the status of a delivery
     */
    updateStatus(id: string, status: string, metadata?: any): Promise<void>;

    /**
     * Finds all active (not completed/cancelled) deliveries
     */
    findActiveDeliveries(): Promise<Delivery[]>;

    /**
     * Gets statistical data for deliveries
     */
    getDeliveryStats(timeRange?: { start: Date; end: Date }): Promise<{
        totalDeliveries: number;
        completedDeliveries: number;
        averageDeliveryTime: number;
        onTimeDeliveryRate: number;
    }>;
}

/**
 * Interface for Route Repository
 * Handles persistence and retrieval of route data
 */
export interface IRouteRepository {
    /**
     * Saves or updates a route
     */
    save(route: Route): Promise<void>;

    /**
     * Finds a route by its ID
     */
    findById(id: string): Promise<Route | null>;

    /**
     * Finds routes for a specific courier, optionally filtered by status
     */
    findByCourierId(courierId: string, status?: RouteStatus): Promise<Route[]>;

    /**
     * Finds all routes with pagination and filtering options
     */
    findAll(options?: {
        page?: number;
        limit?: number;
        status?: RouteStatus;
        courierId?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<{ routes: Route[]; total: number }>;

    /**
     * Updates an existing route
     */
    updateRoute(id: string, updates: Partial<Route>): Promise<Route>;

    /**
     * Deletes a route
     */
    deleteRoute(id: string): Promise<void>;
}

/**
 * Interface for Earnings Repository
 * Handles persistence and retrieval of earnings and payout data
 */
export interface IEarningsRepository {
    /**
     * Saves or updates earnings data
     */
    save(earnings: Earnings): Promise<void>;

    /**
     * Finds earnings for a specific courier
     */
    findByCourierId(courierId: string, timeRange?: { start: Date; end: Date }): Promise<Earnings[]>;

    /**
     * Finds earnings associated with a specific delivery
     */
    findByDeliveryId(deliveryId: string): Promise<Earnings | null>;

    /**
     * Finds all earnings data within an optional time range
     */
    findAllEarnings(timeRange?: { start: Date; end: Date }): Promise<Earnings[]>;

    /**
     * Updates the payment status of an earnings record
     */
    updatePaymentStatus(id: string, status: 'pending' | 'paid' | 'failed', paymentDate?: Date): Promise<void>;

    /**
     * Gets an earnings summary for a specific courier
     */
    getCourierEarningsSummary(courierId: string, period: { start: Date; end: Date }): Promise<{
        totalEarnings: number;
        totalDeliveries: number;
        averagePerDelivery: number;
        pendingPayments: number;
        paidPayments: number;
    }>;

    /**
     * Gets an earnings summary for the entire platform
     */
    getPlatformEarningsSummary(period: { start: Date; end: Date }): Promise<{
        totalRevenue: number;
        totalCommissions: number;
        totalPayouts: number;
        netProfit: number;
        deliveryCount: number;
    }>;
}

/**
 * Interface for Tracking Repository
 * Handles persistence and retrieval of real-time tracking history
 */
export interface ITrackingRepository {
    /**
     * Saves tracking data
     */
    save(tracking: Tracking): Promise<void>;

    /**
     * Finds tracking history for a specific delivery
     */
    findByDeliveryId(deliveryId: string): Promise<Tracking[]>;

    /**
     * Finds tracking history for a specific courier
     */
    findByCourierId(courierId: string, timeRange?: { start: Date; end: Date }): Promise<Tracking[]>;

    /**
     * Gets the most recent tracking record for a delivery
     */
    getLatestTracking(deliveryId: string): Promise<Tracking | null>;

    /**
     * Deletes tracking records older than a certain number of hours
     */
    deleteOldTracking(olderThanHours: number): Promise<number>;
}

// Data structures for Earnings and Tracking (to be converted to entities in Phase 4)

export interface Earnings {
    id: string;
    courierId: string;
    deliveryId: string;
    baseFare: number;
    distanceFee: number;
    weightFee: number;
    priorityFee: number;
    totalEarnings: number;
    commission: number;
    netEarnings: number;
    paymentStatus: 'pending' | 'paid' | 'failed';
    paymentDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface Tracking {
    id: string;
    deliveryId: string;
    courierId: string;
    location: GeoPoint;
    speed: number;
    heading: number;
    timestamp: Date;
    status: string;
    batteryLevel?: number;
    accuracy: number;
}
