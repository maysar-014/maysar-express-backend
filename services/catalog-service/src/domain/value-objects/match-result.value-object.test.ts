import { MatchLevel, MatchResult } from './match-result.value-object';

describe('MatchResult', () => {
  it('evaluates level predicates and auto-merge for strong matches', () => {
    const exact = new MatchResult({
      level: MatchLevel.EXACT,
      score: 1,
      matchedProductId: 'prod-1',
      criteria: { identifierMatch: true },
      requiresConfirmation: false
    });
    const strong = new MatchResult({
      level: MatchLevel.STRONG,
      score: 0.9,
      matchedProductId: 'prod-2',
      criteria: { fingerprintMatch: true },
      requiresConfirmation: true
    });

    expect(exact.isExactMatch()).toBe(true);
    expect(exact.shouldAutoMerge()).toBe(true);
    expect(strong.isStrongMatch()).toBe(true);
    expect(strong.shouldAutoMerge()).toBe(true);
  });

  it('handles possible and no-match results', () => {
    const possible = new MatchResult({
      level: MatchLevel.POSSIBLE,
      score: 0.6,
      criteria: { similarityScore: 0.6, matchedField: 'name' },
      requiresConfirmation: true
    });
    const none = MatchResult.noMatch();

    expect(possible.isPossibleMatch()).toBe(true);
    expect(possible.shouldAutoMerge()).toBe(false);
    expect(none.isNoMatch()).toBe(true);
    expect(none.score).toBe(0);
    expect(none.criteria).toEqual({});
  });
});
