import { TrustSignalType, TrustTier, SIGNAL_WEIGHTS } from './trust-signal.types';

export function applySignal(currentScore: number, signal: TrustSignalType): number {
  const delta = SIGNAL_WEIGHTS[signal];
  return Math.max(0, Math.min(100, currentScore + delta));
}

export function deriveTier(score: number): TrustTier {
  if (score <= 20) return 'NEW_BUYER';
  if (score <= 40) return 'TRUSTED_BEGINNER';
  return 'TRUSTED_BUYER';
}

export function getCODLimit(tier: TrustTier): number | null {
  if (tier === 'NEW_BUYER')        return 30_000;
  if (tier === 'TRUSTED_BEGINNER') return 150_000;
  return null; // TRUSTED_BUYER — unlimited
}

export function replayScore(events: Array<{ delta: number }>): number {
  return events.reduce((score, event) => {
    return Math.max(0, Math.min(100, score + event.delta));
  }, 0);
}
