export type CourierStatus = 'offline' | 'online' | 'busy' | 'delivering' | 'returning';

export const COURIER_STATUSES: CourierStatus[] = [
  'offline',
  'online',
  'busy',
  'delivering',
  'returning'
];

export const isCourierAvailable = (status: CourierStatus): boolean => status === 'online';

export const normalizeCourierStatus = (status: string): CourierStatus => {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'online':
    case 'active':
    case 'available':
      return 'online';
    case 'offline':
    case 'inactive':
      return 'offline';
    case 'busy':
    case 'assigned':
      return 'busy';
    case 'delivering':
    case 'in_transit':
      return 'delivering';
    case 'returning':
      return 'returning';
    default:
      return 'offline';
  }
};
