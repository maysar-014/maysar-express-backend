export interface Enabler {
  id: string;
  name: string;
  email: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  region: string;
  status: 'active' | 'inactive' | 'suspended';
}

export const TIER_INFO = {
  bronze: { name: 'Bronze', color: 'text-amber-600', commission: 5 },
  silver: { name: 'Silver', color: 'text-gray-600', commission: 7 },
  gold: { name: 'Gold', color: 'text-yellow-600', commission: 10 },
  platinum: { name: 'Platinum', color: 'text-purple-600', commission: 15 },
};

export function getEnabler(): Enabler {
  return {
    id: 'enabler-001',
    name: 'Sarah Johnson',
    email: 'sarah@enabler.maysar.com',
    tier: 'gold',
    region: 'East Africa',
    status: 'active',
  };
}

export function hasPermission(permission: string): boolean {
  const enabler = getEnabler();
  const permissions = {
    bronze: ['view_tasks', 'submit_reports'],
    silver: ['view_tasks', 'submit_reports', 'manage_sellers'],
    gold: ['view_tasks', 'submit_reports', 'manage_sellers', 'view_analytics'],
    platinum: ['view_tasks', 'submit_reports', 'manage_sellers', 'view_analytics', 'manage_training'],
  };
  
  return permissions[enabler.tier]?.includes(permission) || false;
}