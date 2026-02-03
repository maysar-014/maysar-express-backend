export interface CourierLocationUpdateDto {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface DeliveryAcceptanceDto {
  deliveryId: string;
  estimatedArrival?: Date;
  notes?: string;
}

export interface DeliveryRejectionDto {
  deliveryId: string;
  reason: string;
  alternativeSuggestion?: string;
}

export interface PayoutRequestDto {
  amount: number;
  paymentMethod: 'bank_transfer' | 'mobile_money' | 'cash';
  accountDetails: {
    accountNumber?: string;
    bankName?: string;
    phoneNumber?: string;
  };
}

export interface RouteOptimizationDto {
  deliveryIds: string[];
  startLocation: {
    latitude: number;
    longitude: number;
  };
  preferences: {
    avoidTolls: boolean;
    avoidHighways: boolean;
    prioritizeUrgent: boolean;
  };
}

export interface PerformanceFilterDto {
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month' | 'year';
  includeComparisons?: boolean;
}

export interface LocationHistoryDto {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  includeAccuracy?: boolean;
}

export interface EarningsFilterDto {
  startDate?: Date;
  endDate?: Date;
  includeBreakdown?: boolean;
  includePending?: boolean;
}

// Response DTOs
export interface CourierPerformanceResponseDto {
  onTimeDeliveryRate: number;
  customerRating: number;
  completedDeliveries: number;
  totalEarnings: number;
  averageDeliveryTime: number;
  efficiency: number;
  ranking: number;
}

export interface EarningsResponseDto {
  totalAmount: number;
  breakdown: {
    baseEarnings: number;
    bonuses: number;
    penalties: number;
    tips: number;
  };
  period: string;
  currency: string;
}

export interface DeliveryResponseDto {
  id: string;
  orderId: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedDeliveryTime: Date;
  packageDetails: {
    weight: number;
    value: number;
    fragile: boolean;
  };
  customerInfo: {
    name: string;
    phone: string;
  };
}