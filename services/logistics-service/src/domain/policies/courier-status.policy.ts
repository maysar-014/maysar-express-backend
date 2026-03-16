import { CourierStatus } from '../enums/courier-status.enum';

export class CourierStatusPolicy {
  private readonly transitions: Record<CourierStatus, CourierStatus[]> = {
    offline: ['online'],
    online: ['offline', 'busy', 'delivering'],
    busy: ['online', 'delivering', 'returning'],
    delivering: ['returning', 'online'],
    returning: ['online']
  };

  canTransition(from: CourierStatus, to: CourierStatus): boolean {
    if (from === to) return true;
    return this.transitions[from]?.includes(to) ?? false;
  }

  assertTransition(from: CourierStatus, to: CourierStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid courier status transition from ${from} to ${to}`);
    }
  }
}
