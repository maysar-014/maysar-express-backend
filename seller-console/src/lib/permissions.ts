// Seller tier definitions and permissions
export type SellerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface SellerPermissions {
  dashboard: boolean;
  products: boolean;
  inventory: boolean;
  orders: boolean;
  analytics: boolean;
  promotions: boolean;
  wallet: boolean;
  settings: boolean;
  support: boolean;
  advancedAnalytics: boolean;
  bulkOperations: boolean;
  apiAccess: boolean;
}

export const TIER_PERMISSIONS: Record<SellerTier, SellerPermissions> = {
  bronze: {
    dashboard: true,
    products: true,
    inventory: true,
    orders: true,
    analytics: true,
    promotions: false,
    wallet: true,
    settings: true,
    support: true,
    advancedAnalytics: false,
    bulkOperations: false,
    apiAccess: false,
  },
  silver: {
    dashboard: true,
    products: true,
    inventory: true,
    orders: true,
    analytics: true,
    promotions: true,
    wallet: true,
    settings: true,
    support: true,
    advancedAnalytics: false,
    bulkOperations: true,
    apiAccess: false,
  },
  gold: {
    dashboard: true,
    products: true,
    inventory: true,
    orders: true,
    analytics: true,
    promotions: true,
    wallet: true,
    settings: true,
    support: true,
    advancedAnalytics: true,
    bulkOperations: true,
    apiAccess: false,
  },
  platinum: {
    dashboard: true,
    products: true,
    inventory: true,
    orders: true,
    analytics: true,
    promotions: true,
    wallet: true,
    settings: true,
    support: true,
    advancedAnalytics: true,
    bulkOperations: true,
    apiAccess: true,
  },
  diamond: {
    dashboard: true,
    products: true,
    inventory: true,
    orders: true,
    analytics: true,
    promotions: true,
    wallet: true,
    settings: true,
    support: true,
    advancedAnalytics: true,
    bulkOperations: true,
    apiAccess: true,
  },
};

export const TIER_INFO = {
  bronze: {
    name: 'Bronze Seller',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
    description: 'New seller with basic features',
    benefits: ['Basic analytics', 'Standard support', 'Up to 100 products']
  },
  silver: {
    name: 'Silver Seller',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    description: 'Growing seller with promotional tools',
    benefits: ['Promotions & discounts', 'Bulk operations', 'Up to 500 products']
  },
  gold: {
    name: 'Gold Seller',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    description: 'Established seller with advanced analytics',
    benefits: ['Advanced analytics', 'Priority support', 'Up to 1000 products']
  },
  platinum: {
    name: 'Platinum Seller',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    description: 'Premium seller with API access',
    benefits: ['API access', 'Custom integrations', 'Unlimited products']
  },
  diamond: {
    name: 'Diamond Seller',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    description: 'Elite seller with full platform access',
    benefits: ['White-glove support', 'Custom features', 'Dedicated account manager']
  }
};

export function hasPermission(tier: SellerTier, permission: keyof SellerPermissions): boolean {
  return TIER_PERMISSIONS[tier][permission];
}

export function getSeller() {
  // Mock seller data - in production, this would come from authentication
  return {
    id: 'SEL-2024-001',
    name: 'TechStore Tanzania',
    businessName: 'TechStore Tanzania Ltd',
    tier: 'gold' as SellerTier,
    trustScore: 4.7,
    totalSales: 2450000,
    monthlyRevenue: 850000,
    productsCount: 156,
    ordersCount: 1247,
    rating: 4.8,
    joinedDate: '2024-01-15'
  };
}