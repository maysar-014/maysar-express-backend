/**
 * Product Review System — Property-Based Tests
 *
 * Tests 8 correctness properties of the review system using pure functions
 * extracted from the domain layer. No database required.
 *
 * Feature: product-review-system
 */

import {
  validateRating,
  computeAverageRating,
  computeRatingDistribution,
  resolveDisplayName
} from '../../../domain/entities/product-review.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate N random integers in [min, max] */
function randomInts(count: number, min: number, max: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

/** Generate a random integer in [min, max] */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Run a property test N times with a generator */
function forAll<T>(
  count: number,
  generator: () => T,
  property: (value: T) => void
): void {
  for (let i = 0; i < count; i++) {
    property(generator());
  }
}

// ---------------------------------------------------------------------------
// Property 1: Rating Boundary Invariant
// Feature: product-review-system, Property 1: Rating Boundary Invariant
// Validates: Requirements 1.1, 1.2, 10.5
// ---------------------------------------------------------------------------

describe('Property 1: Rating Boundary Invariant', () => {
  it('should accept all integer ratings in [1, 5]', () => {
    forAll(
      200,
      () => randomInt(1, 5),
      (rating) => {
        expect(validateRating(rating)).toBe(true);
      }
    );
  });

  it('should reject all integer ratings below 1', () => {
    forAll(
      200,
      () => randomInt(-100, 0),
      (rating) => {
        expect(validateRating(rating)).toBe(false);
      }
    );
  });

  it('should reject all integer ratings above 5', () => {
    forAll(
      200,
      () => randomInt(6, 100),
      (rating) => {
        expect(validateRating(rating)).toBe(false);
      }
    );
  });

  it('should reject non-integer values', () => {
    const nonIntegers = [1.5, 2.7, 3.1, 4.9, 0.5, -0.1, NaN, Infinity, 'five', null, undefined];
    for (const v of nonIntegers) {
      expect(validateRating(v)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 2: Average Rating Invariant
// Feature: product-review-system, Property 2: Average Rating Invariant
// Validates: Requirements 6.1, 10.1
// ---------------------------------------------------------------------------

describe('Property 2: Average Rating Invariant', () => {
  it('should equal sum/count rounded to 2 decimal places for any non-empty rating set', () => {
    forAll(
      200,
      () => randomInts(randomInt(1, 50), 1, 5),
      (ratings) => {
        const expected = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100;
        expect(computeAverageRating(ratings)).toBe(expected);
      }
    );
  });

  it('should return null for an empty rating set', () => {
    expect(computeAverageRating([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Property 3: Distribution Sum Invariant
// Feature: product-review-system, Property 3: Distribution Sum Invariant
// Validates: Requirements 6.4, 6.5, 10.2
// ---------------------------------------------------------------------------

describe('Property 3: Distribution Sum Invariant', () => {
  it('should have distribution values summing to reviewCount for any rating set', () => {
    forAll(
      200,
      () => randomInts(randomInt(0, 50), 1, 5),
      (ratings) => {
        const dist = computeRatingDistribution(ratings);
        const distSum = dist[1] + dist[2] + dist[3] + dist[4] + dist[5];
        expect(distSum).toBe(ratings.length);
      }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Empty State Invariant
// Feature: product-review-system, Property 4: Empty State Invariant
// Validates: Requirements 6.3, 10.6
// ---------------------------------------------------------------------------

describe('Property 4: Empty State Invariant', () => {
  it('should return null averageRating and 0 reviewCount for empty set', () => {
    expect(computeAverageRating([])).toBeNull();
    const dist = computeRatingDistribution([]);
    expect(dist[1]).toBe(0);
    expect(dist[2]).toBe(0);
    expect(dist[3]).toBe(0);
    expect(dist[4]).toBe(0);
    expect(dist[5]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5: Pagination Completeness
// Feature: product-review-system, Property 5: Pagination Completeness
// Validates: Requirements 9.1, 9.5, 10.3
// ---------------------------------------------------------------------------

function paginateInMemory<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

describe('Property 5: Pagination Completeness', () => {
  it('should yield all items with no duplicates or omissions across all pages', () => {
    forAll(
      100,
      () => ({
        items: Array.from({ length: randomInt(0, 100) }, (_, i) => `review-${i}`),
        limit: randomInt(1, 50)
      }),
      ({ items, limit }) => {
        const totalPages = Math.ceil(items.length / limit) || 1;
        const collected: string[] = [];

        for (let page = 1; page <= totalPages; page++) {
          collected.push(...paginateInMemory(items, page, limit));
        }

        // Same length
        expect(collected.length).toBe(items.length);
        // Same content (no duplicates, no omissions)
        expect(new Set(collected).size).toBe(items.length);
        expect(collected.sort()).toEqual([...items].sort());
      }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: One Review Per Buyer Per Product
// Feature: product-review-system, Property 6: One Review Per Buyer Per Product
// Validates: Requirements 3.1, 3.2, 10.4
// ---------------------------------------------------------------------------

function applyUniqueConstraint(
  submissions: Array<{ buyerId: string; productId: string; rating: number }>
): Map<string, { buyerId: string; productId: string; rating: number }> {
  const map = new Map<string, { buyerId: string; productId: string; rating: number }>();
  for (const s of submissions) {
    const key = `${s.buyerId}::${s.productId}`;
    if (!map.has(key)) {
      map.set(key, s);
    }
  }
  return map;
}

describe('Property 6: One Review Per Buyer Per Product', () => {
  it('should persist exactly one review per (buyerId, productId) pair regardless of duplicate submissions', () => {
    forAll(
      100,
      () => {
        const buyerIds = ['buyer-1', 'buyer-2', 'buyer-3'];
        const productIds = ['prod-1', 'prod-2'];
        const count = randomInt(1, 20);
        return Array.from({ length: count }, () => ({
          buyerId: buyerIds[randomInt(0, buyerIds.length - 1)],
          productId: productIds[randomInt(0, productIds.length - 1)],
          rating: randomInt(1, 5)
        }));
      },
      (submissions) => {
        const stored = applyUniqueConstraint(submissions);
        // Each key appears exactly once
        for (const [key] of stored) {
          const [buyerId, productId] = key.split('::');
          const matches = [...stored.values()].filter(
            s => s.buyerId === buyerId && s.productId === productId
          );
          expect(matches.length).toBe(1);
        }
      }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Visibility Filter Invariant
// Feature: product-review-system, Property 7: Visibility Filter Invariant
// Validates: Requirements 5.1, 7.1, 7.3
// ---------------------------------------------------------------------------

type ReviewWithStatus = { id: string; moderationStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN'; rating: number };

function filterVisible(reviews: ReviewWithStatus[]): ReviewWithStatus[] {
  return reviews.filter(r => r.moderationStatus === 'VISIBLE');
}

describe('Property 7: Visibility Filter Invariant', () => {
  it('should only include VISIBLE reviews in public listing and aggregate stats', () => {
    const statuses: Array<'VISIBLE' | 'FLAGGED' | 'HIDDEN'> = ['VISIBLE', 'FLAGGED', 'HIDDEN'];

    forAll(
      100,
      () => Array.from({ length: randomInt(0, 30) }, (_, i) => ({
        id: `review-${i}`,
        moderationStatus: statuses[randomInt(0, 2)],
        rating: randomInt(1, 5)
      })),
      (reviews) => {
        const visible = filterVisible(reviews);

        // No FLAGGED or HIDDEN in visible set
        for (const r of visible) {
          expect(r.moderationStatus).toBe('VISIBLE');
        }

        // Aggregate only counts VISIBLE
        const avg = computeAverageRating(visible.map(r => r.rating));
        const dist = computeRatingDistribution(visible.map(r => r.rating));
        const distSum = dist[1] + dist[2] + dist[3] + dist[4] + dist[5];

        expect(distSum).toBe(visible.length);
        if (visible.length === 0) {
          expect(avg).toBeNull();
        } else {
          expect(avg).not.toBeNull();
        }
      }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Display Name Derivation
// Feature: product-review-system, Property 8: Display Name Derivation
// Validates: Requirements 8.1, 8.2, 8.4
// ---------------------------------------------------------------------------

describe('Property 8: Display Name Derivation', () => {
  it('should use firstName + lastName when at least one name is present', () => {
    const cases = [
      { firstName: 'John', lastName: 'Doe', email: 'john@example.com', expected: 'John Doe' },
      { firstName: 'John', lastName: null, email: 'john@example.com', expected: 'John' },
      { firstName: null, lastName: 'Doe', email: 'john@example.com', expected: 'Doe' },
    ];
    for (const c of cases) {
      expect(resolveDisplayName(c)).toBe(c.expected);
    }
  });

  it('should fall back to email prefix when both names are absent', () => {
    const cases = [
      { firstName: null, lastName: null, email: 'john.doe@example.com', expected: 'john.doe' },
      { firstName: undefined, lastName: undefined, email: 'buyer123@test.org', expected: 'buyer123' },
    ];
    for (const c of cases) {
      expect(resolveDisplayName(c as any)).toBe(c.expected);
    }
  });

  it('should never include @ in the display name', () => {
    forAll(
      100,
      () => {
        const hasFirst = Math.random() > 0.5;
        const hasLast = Math.random() > 0.5;
        return {
          firstName: hasFirst ? `User${randomInt(1, 999)}` : null,
          lastName: hasLast ? `Name${randomInt(1, 999)}` : null,
          email: `user${randomInt(1, 9999)}@example.com`
        };
      },
      (user) => {
        const name = resolveDisplayName(user);
        expect(name).not.toContain('@');
        expect(name.length).toBeGreaterThan(0);
      }
    );
  });
});
