import { ContributionScore } from './contribution-score.value-object';

describe('ContributionScore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates default score and updates contributions', () => {
    const score = ContributionScore.create();

    score.addContribution(100);
    score.recordAnswer(true, 4, 3);
    score.addPeerUpvote();
    score.updateQualityMultiplier();

    expect(score.rawScore).toBe(100);
    expect(score.answerAcceptanceRate).toBe(0.8);
    expect(score.peerUpvotes).toBe(1);
    expect(score.qualityMultiplier).toBeGreaterThan(1);
    expect(score.getTier()).toBe('BRONZE');
    expect(score.isActive()).toBe(true);
  });

  it('applies score decay after long inactivity', () => {
    const score = ContributionScore.fromData({
      score: 1000,
      answerAcceptanceRate: 0.5,
      peerUpvotes: 0,
      expertEndorsements: 0,
      lastContributionAt: new Date('2025-06-01T00:00:00.000Z'),
      qualityMultiplier: 1
    });

    expect(score.score).toBeLessThan(1000);
    expect(score.meetsMinimumThreshold(900)).toBe(false);
  });

  it('adds expert endorsement with bonus contribution and validates input', () => {
    const score = ContributionScore.create();
    score.addExpertEndorsement();

    expect(score.expertEndorsements).toBe(1);
    expect(score.rawScore).toBe(50);
    expect(() => score.addContribution(0)).toThrow('Contribution points must be positive');
    expect(() => score.recordAnswer(false, 0, 0)).toThrow('Total answers must be greater than 0');
  });

  it('validates constructor ranges and serializes decayed score', () => {
    expect(() =>
      ContributionScore.fromData({
        score: -1,
        answerAcceptanceRate: 0.1,
        peerUpvotes: 0,
        expertEndorsements: 0,
        lastContributionAt: new Date(),
        qualityMultiplier: 1
      })
    ).toThrow('Score cannot be less than 0');

    const score = ContributionScore.fromData({
      score: 600,
      answerAcceptanceRate: 0.5,
      peerUpvotes: 10,
      expertEndorsements: 2,
      lastContributionAt: new Date(),
      qualityMultiplier: 1.2
    });
    expect(score.toJSON()).toEqual(expect.objectContaining({ score: score.score }));
    expect(score.getTier()).toBe('SILVER');
  });
});
