/**
 * Unit Tests — generateDefaultSlug
 *
 * Covers:
 * - Normal business names (ASCII, kebab-case output)
 * - Collision handling up to counter -5
 * - Non-ASCII business name (empty-after-sanitise fallback to sellerId)
 * - Very long names (truncation via normal kebab process)
 * - The cap-exceeded error path
 */

import { generateDefaultSlug } from '../slug.utils';

/** Helper: builds an existsCheck that rejects a specific set of slugs */
function existsFor(...taken: string[]) {
  return async (candidate: string) => taken.includes(candidate);
}

/** Helper: existsCheck that always returns false (nothing taken) */
const nothingTaken = async (_candidate: string) => false;

// ---------------------------------------------------------------------------
// Normal business names
// ---------------------------------------------------------------------------
describe('generateDefaultSlug — normal business names', () => {
  it('returns a lowercase kebab-case slug from a simple name', async () => {
    const slug = await generateDefaultSlug('Pendo Crafts', 'usr_ABC', nothingTaken);
    expect(slug).toBe('pendo-crafts');
  });

  it('lowercases the entire name', async () => {
    const slug = await generateDefaultSlug('MAYSAR ELECTRONICS', 'usr_ABC', nothingTaken);
    expect(slug).toBe('maysar-electronics');
  });

  it('collapses multiple spaces/special chars into a single dash', async () => {
    const slug = await generateDefaultSlug('Azam--Oil  &  Grains', 'usr_ABC', nothingTaken);
    expect(slug).toBe('azam-oil-grains');
  });

  it('strips leading and trailing dashes', async () => {
    const slug = await generateDefaultSlug('---Shop Name---', 'usr_ABC', nothingTaken);
    expect(slug).toBe('shop-name');
  });

  it('preserves digits in the business name', async () => {
    const slug = await generateDefaultSlug('Shop 24/7', 'usr_ABC', nothingTaken);
    expect(slug).toBe('shop-24-7');
  });

  it('slug matches the pattern [a-z0-9][a-z0-9-]*', async () => {
    const slug = await generateDefaultSlug('Nyumbani Stores Ltd.', 'usr_ABC', nothingTaken);
    expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });
});

// ---------------------------------------------------------------------------
// Collision handling
// ---------------------------------------------------------------------------
describe('generateDefaultSlug — collision handling', () => {
  it('appends -2 when the base slug is taken', async () => {
    const slug = await generateDefaultSlug('Best Shop', 'usr_ABC', existsFor('best-shop'));
    expect(slug).toBe('best-shop-2');
  });

  it('appends -3 when both base and -2 are taken', async () => {
    const slug = await generateDefaultSlug('Best Shop', 'usr_ABC', existsFor('best-shop', 'best-shop-2'));
    expect(slug).toBe('best-shop-3');
  });

  it('finds -5 when -2 through -4 are also taken', async () => {
    const slug = await generateDefaultSlug(
      'Best Shop',
      'usr_ABC',
      existsFor('best-shop', 'best-shop-2', 'best-shop-3', 'best-shop-4')
    );
    expect(slug).toBe('best-shop-5');
  });

  it('calls existsCheck for each candidate until a free slot is found', async () => {
    const calls: string[] = [];
    const trackingCheck = async (candidate: string) => {
      calls.push(candidate);
      return candidate !== 'my-store-3'; // free at -3
    };

    const slug = await generateDefaultSlug('My Store', 'usr_ABC', trackingCheck);
    expect(slug).toBe('my-store-3');
    expect(calls).toEqual(['my-store', 'my-store-2', 'my-store-3']);
  });

  it('throws when all slots from base to -99 are taken', async () => {
    // Build the set of all slugs that would be checked
    const allTaken = new Set(['cool-shop']);
    for (let i = 2; i <= 99; i++) allTaken.add(`cool-shop-${i}`);

    await expect(
      generateDefaultSlug('Cool Shop', 'usr_ABC', async (c) => allTaken.has(c))
    ).rejects.toThrow(/unique slug/);
  });
});

// ---------------------------------------------------------------------------
// Non-ASCII business name (fallback to sellerId)
// ---------------------------------------------------------------------------
describe('generateDefaultSlug — non-ASCII business name fallback', () => {
  it('falls back to sellerId excerpt when name is pure Arabic', async () => {
    const slug = await generateDefaultSlug('مصنع الأمل', 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z', nothingTaken);
    // "مصنع الأمل" sanitises to "" → fallback: strip "usr_", take 12, lowercase
    expect(slug).toBe('01krfz1e5g6c');
  });

  it('falls back when name contains only emoji / non-alphanumeric chars', async () => {
    const slug = await generateDefaultSlug('🌟⭐💫', 'usr_XYZ123456789', nothingTaken);
    expect(slug).toBe('xyz123456789');
  });

  it('fallback slug does not start with usr_', async () => {
    const slug = await generateDefaultSlug('非ASCII名前', 'usr_ABCDEF', nothingTaken);
    expect(slug).not.toContain('usr_');
    expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it('handles collision on the fallback slug', async () => {
    const slug = await generateDefaultSlug(
      'مصنع الأمل',
      'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z',
      existsFor('01krfz1e5g6c')
    );
    expect(slug).toBe('01krfz1e5g6c-2');
  });

  it('truncates sellerId excerpt to 12 characters', async () => {
    // sellerId "usr_ABCDEFGHIJKLMNOP" → strip prefix → "ABCDEFGHIJKLMNOP" → first 12 → "abcdefghijkl"
    const slug = await generateDefaultSlug('纯中文店铺', 'usr_ABCDEFGHIJKLMNOP', nothingTaken);
    expect(slug).toBe('abcdefghijkl');
    expect(slug.length).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Long business names
// ---------------------------------------------------------------------------
describe('generateDefaultSlug — long business names', () => {
  it('handles a very long business name without throwing', async () => {
    const longName = 'Mkuu wa Bidhaa za Nyumbani na Vifaa vya Ujenzi na Kilimo Tanzania';
    const slug = await generateDefaultSlug(longName, 'usr_ABC', nothingTaken);
    expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    expect(slug.length).toBeGreaterThan(0);
  });

  it('slug from long name does not start or end with a dash', async () => {
    const longName = '---Very Long Business Name With Lots Of Words And Special Chars!!! ---';
    const slug = await generateDefaultSlug(longName, 'usr_ABC', nothingTaken);
    expect(slug).not.toMatch(/^-/);
    expect(slug).not.toMatch(/-$/);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('generateDefaultSlug — edge cases', () => {
  it('handles an empty business name string (fallback to sellerId)', async () => {
    const slug = await generateDefaultSlug('', 'usr_EMPTY123456', nothingTaken);
    expect(slug).toBe('empty123456');
    expect(slug).not.toContain('usr_');
  });

  it('handles a business name that is only whitespace', async () => {
    const slug = await generateDefaultSlug('   ', 'usr_SPACE123456', nothingTaken);
    expect(slug).not.toContain('usr_');
    expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it('handles sellerId without usr_ prefix gracefully', async () => {
    const slug = await generateDefaultSlug('مصنع', 'NOPREFIXID12345', nothingTaken);
    // Strip prefix (nothing to strip) → take first 12, lowercase
    expect(slug).toBe('noprefixid12');
  });
});
