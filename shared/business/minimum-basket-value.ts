export const GLOBAL_MINIMUM_BASKET_VALUE_TZS = 50_000;

export interface MinimumBasketValueAssessment {
  eligible: boolean;
  minimumBasketValue: number;
  shortfall: number;
  message?: string;
}

export function assessMinimumBasketValue(amount: number): MinimumBasketValueAssessment {
  const normalizedAmount = Number(amount);
  const eligible = Number.isFinite(normalizedAmount) && normalizedAmount >= GLOBAL_MINIMUM_BASKET_VALUE_TZS;
  const shortfall = eligible ? 0 : Math.max(0, GLOBAL_MINIMUM_BASKET_VALUE_TZS - (Number.isFinite(normalizedAmount) ? normalizedAmount : 0));

  return {
    eligible,
    minimumBasketValue: GLOBAL_MINIMUM_BASKET_VALUE_TZS,
    shortfall,
    message: eligible
      ? undefined
      : `Minimum basket value is TZS ${GLOBAL_MINIMUM_BASKET_VALUE_TZS.toLocaleString('en-US')}. Add TZS ${shortfall.toLocaleString('en-US')} more or choose pickup.`
  };
}

export function assertMinimumBasketValue(amount: number): void {
  const assessment = assessMinimumBasketValue(amount);
  if (!assessment.eligible) {
    throw new Error(assessment.message);
  }
}
