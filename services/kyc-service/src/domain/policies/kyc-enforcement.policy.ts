export class KycEnforcementPolicy {
  getRestrictions(kycLevel: number): string[] {
    const restrictions: string[] = [];

    if (kycLevel < 1) {
      restrictions.push('create_more_listings');
    }

    if (kycLevel < 2) {
      restrictions.push('withdraw_funds');
    }

    if (kycLevel < 3) {
      restrictions.push('high_volume_orders');
    }

    return restrictions;
  }

  canPerformAction(kycLevel: number, action: string): boolean {
    return !this.getRestrictions(kycLevel).includes(action);
  }
}

