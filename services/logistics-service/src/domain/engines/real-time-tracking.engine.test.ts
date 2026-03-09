import { RealTimeTrackingEngine, type LocationPoint } from './real-time-tracking.engine';

const point = (
  lat: number,
  lng: number,
  timestamp: string,
  accuracy: number,
  speed?: number
): LocationPoint => ({
  lat,
  lng,
  timestamp: new Date(timestamp),
  accuracy,
  speed
});

describe('RealTimeTrackingEngine', () => {
  let engine: RealTimeTrackingEngine;

  beforeEach(() => {
    engine = new RealTimeTrackingEngine();
  });

  it('validates location data and reports violations', () => {
    expect(
      engine.validateLocationData(point(-6.79, 39.2, '2026-03-08T10:00:00.000Z', 10, 40))
    ).toEqual({ isValid: true, violations: [] });

    const invalid = engine.validateLocationData(
      point(-99, 181, '2026-03-08T10:00:00.000Z', 120, 250)
    );
    expect(invalid.isValid).toBe(false);
    expect(invalid.violations).toEqual(
      expect.arrayContaining([
        'Invalid latitude range',
        'Invalid longitude range',
        'Invalid accuracy range',
        'Invalid speed range'
      ])
    );
  });

  it('detects speed anomalies with proper severity levels', () => {
    expect(engine.detectSpeedAnomaly(70, 80)).toEqual({
      isAnomaly: false,
      severity: 'low',
      description: 'Speed within limits'
    });
    expect(engine.detectSpeedAnomaly(90, 80)).toEqual(
      expect.objectContaining({ isAnomaly: true, severity: 'low' })
    );
    expect(engine.detectSpeedAnomaly(100, 80)).toEqual(
      expect.objectContaining({ isAnomaly: true, severity: 'medium' })
    );
    expect(engine.detectSpeedAnomaly(120, 80)).toEqual(
      expect.objectContaining({ isAnomaly: true, severity: 'high' })
    );
  });

  it('calculates geographic distance using great-circle formula', () => {
    const same = engine.calculateDistance(
      point(-6.79, 39.2, '2026-03-08T10:00:00.000Z', 10),
      point(-6.79, 39.2, '2026-03-08T10:05:00.000Z', 10)
    );
    const nearby = engine.calculateDistance(
      point(-6.79, 39.2, '2026-03-08T10:00:00.000Z', 10),
      point(-6.8, 39.21, '2026-03-08T10:05:00.000Z', 10)
    );

    expect(same).toBeCloseTo(0, 5);
    expect(nearby).toBeGreaterThan(0);
  });

  it('detects location jump anomalies for invalid timestamps and unrealistic jumps', () => {
    const previous = point(-6.79, 39.2, '2026-03-08T10:00:00.000Z', 10);

    const invalidTime = engine.detectLocationJump(
      previous,
      point(-6.8, 39.21, '2026-03-08T10:00:00.000Z', 10)
    );
    expect(invalidTime).toEqual(
      expect.objectContaining({
        isAnomaly: true,
        severity: 'high',
        description: 'Invalid timestamp sequence'
      })
    );

    const normalMove = engine.detectLocationJump(
      previous,
      point(-6.8, 39.21, '2026-03-08T11:00:00.000Z', 10),
      120
    );
    expect(normalMove).toEqual(
      expect.objectContaining({ isAnomaly: false, severity: 'low' })
    );

    const jump = engine.detectLocationJump(
      previous,
      point(-4.0, 40.0, '2026-03-08T10:05:00.000Z', 10),
      100
    );
    expect(jump).toEqual(
      expect.objectContaining({ isAnomaly: true, severity: 'high' })
    );
  });

  it('calculates accuracy score boundaries', () => {
    expect(engine.calculateAccuracyScore(3)).toBe(100);
    expect(engine.calculateAccuracyScore(100)).toBe(0);
    expect(engine.calculateAccuracyScore(50)).toBe(53);
  });

  it('assesses tracking quality for empty and populated samples', () => {
    expect(engine.assessTrackingQuality([])).toEqual({
      overallScore: 0,
      accuracyScore: 0,
      consistencyScore: 0,
      coverageScore: 0
    });

    const locations = Array.from({ length: 12 }, (_, i) =>
      point(-6.79 + i * 0.001, 39.2 + i * 0.001, `2026-03-08T10:${String(i).padStart(2, '0')}:00.000Z`, 10 + (i % 2))
    );
    const quality = engine.assessTrackingQuality(locations);

    expect(quality.coverageScore).toBe(100);
    expect(quality.accuracyScore).toBeGreaterThan(90);
    expect(quality.overallScore).toBeGreaterThan(85);
  });

  it('calculates route efficiency and handles invalid baselines', () => {
    expect(engine.calculateRouteEfficiency(10, 8)).toBe(80);
    expect(engine.calculateRouteEfficiency(10, 0)).toBe(0);
  });

  it('validates tracking frequency and identifies gaps', () => {
    expect(engine.validateTrackingFrequency([point(-6.79, 39.2, '2026-03-08T10:00:00.000Z', 10)])).toEqual({
      isValid: false,
      gaps: 0,
      averageInterval: 0
    });

    const goodSeries = [
      point(-6.79, 39.2, '2026-03-08T10:00:00.000Z', 10),
      point(-6.791, 39.201, '2026-03-08T10:00:30.000Z', 10),
      point(-6.792, 39.202, '2026-03-08T10:01:00.000Z', 10)
    ];
    expect(engine.validateTrackingFrequency(goodSeries, 30)).toEqual({
      isValid: true,
      gaps: 0,
      averageInterval: 30
    });

    const withGap = [
      point(-6.79, 39.2, '2026-03-08T10:00:00.000Z', 10),
      point(-6.791, 39.201, '2026-03-08T10:02:00.000Z', 10),
      point(-6.792, 39.202, '2026-03-08T10:05:00.000Z', 10)
    ];
    expect(engine.validateTrackingFrequency(withGap, 30)).toEqual({
      isValid: false,
      gaps: 2,
      averageInterval: 150
    });
  });
});
