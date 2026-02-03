export type SupplierTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Supplier {
  id: string;
  companyName: string;
  tier: SupplierTier;
  qualityScore: number;
  fillRate: number;
  onTimeDelivery: number;
  totalRevenue: number;
  activeContracts: number;
}

export const TIER_INFO = {
  bronze: {
    name: 'Bronze Supplier',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Basic supplier access with standard features',
    benefits: ['Basic catalog management', 'Standard pricing', 'Basic analytics', 'Email support'],
    minQualityScore: 0,
    maxSKUs: 100,
    bulkOperations: false,
    contractPricing: false,
    prioritySupport: false
  },
  silver: {
    name: 'Silver Supplier',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Enhanced supplier features with better visibility',
    benefits: ['Enhanced catalog', 'Volume discounts', 'Advanced analytics', 'Priority support'],
    minQualityScore: 70,
    maxSKUs: 500,
    bulkOperations: true,
    contractPricing: true,
    prioritySupport: false
  },
  gold: {
    name: 'Gold Supplier',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Premium supplier with advanced tools and priority',
    benefits: ['Unlimited SKUs', 'Custom pricing', 'Demand forecasting', 'Dedicated support'],
    minQualityScore: 80,
    maxSKUs: 2000,
    bulkOperations: true,
    contractPricing: true,
    prioritySupport: true
  },
  platinum: {
    name: 'Platinum Supplier',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Elite supplier with full platform integration',
    benefits: ['API access', 'White-label options', 'Custom integrations', 'Account manager'],
    minQualityScore: 90,
    maxSKUs: 10000,
    bulkOperations: true,
    contractPricing: true,
    prioritySupport: true
  },
  diamond: {
    name: 'Diamond Supplier',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Strategic partner with exclusive benefits',
    benefits: ['Strategic partnership', 'Revenue sharing', 'Co-marketing', 'Executive access'],
    minQualityScore: 95,
    maxSKUs: -1, // unlimited
    bulkOperations: true,
    contractPricing: true,
    prioritySupport: true
  }
};

export const PERMISSIONS = {
  catalog: {
    basic: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    bulk: ['silver', 'gold', 'platinum', 'diamond'],
    unlimited: ['gold', 'platinum', 'diamond']
  },
  pricing: {
    standard: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    contract: ['silver', 'gold', 'platinum', 'diamond'],
    custom: ['gold', 'platinum', 'diamond']
  },
  analytics: {
    basic: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    advanced: ['silver', 'gold', 'platinum', 'diamond'],
    forecasting: ['gold', 'platinum', 'diamond']
  },
  integration: {
    webhook: ['gold', 'platinum', 'diamond'],
    api: ['platinum', 'diamond'],
    whitelabel: ['platinum', 'diamond']
  },
  support: {
    email: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    priority: ['gold', 'platinum', 'diamond'],
    dedicated: ['platinum', 'diamond']
  }
};

export function getSupplier(): Supplier {
  return {
    id: 'SUP-001',
    companyName: 'TechSource Tanzania Ltd',
    tier: 'gold',
    qualityScore: 87.5,
    fillRate: 94.2,
    onTimeDelivery: 91.8,
    totalRevenue: 15750000,
    activeContracts: 12
  };
}

export function hasPermission(tier: SupplierTier, category: keyof typeof PERMISSIONS, level: string): boolean {
  const permission = PERMISSIONS[category]?.[level as keyof typeof PERMISSIONS[typeof category]];
  return permission ? permission.includes(tier) : false;
}