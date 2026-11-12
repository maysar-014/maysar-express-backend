/**
 * Slug Utilities — Seller Storefront
 *
 * Provides `generateDefaultSlug()` for producing a URL-safe, human-readable
 * slug from a seller's business name, with collision avoidance and a
 * fallback derived from the sellerId when the business name yields no
 * ASCII characters.
 */

/**
 * Generate a default slug for a seller's storefront.
 *
 * Algorithm:
 * 1. Normalise `businessName`: lowercase, replace non-alphanumeric runs with
 *    `-`, strip leading/trailing `-`.
 * 2. If the result is empty (pure non-ASCII input), fall back to a URL-safe
 *    excerpt of `sellerId`: strip the `usr_` prefix, take the first 12
 *    characters, lowercase (e.g. `"usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z"` →
 *    `"01krfz1e5g6c"`).
 * 3. Check the candidate via `existsCheck`. If available, return it.
 * 4. Otherwise append `-2`, `-3`, … up to `-99`. Throw if the cap is reached.
 *
 * @param businessName  The seller's registered business name.
 * @param sellerId      The seller's internal ID (used as a fallback base).
 * @param existsCheck   Async predicate; resolves to `true` if the candidate
 *                      slug is already taken.
 * @returns The first available slug.
 */
export async function generateDefaultSlug(
  businessName: string,
  sellerId: string,
  existsCheck: (candidate: string) => Promise<boolean>
): Promise<string> {
  // Step 1 — Normalise business name to a kebab-case slug
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric runs with '-'
    .replace(/^-+|-+$/g, '');     // Strip leading/trailing dashes

  // Step 2 — Fallback when sanitisation yields nothing (e.g. pure non-ASCII)
  const candidate = base.length > 0
    ? base
    : sellerId.replace(/^usr_/i, '').slice(0, 12).toLowerCase();

  // Step 3 — Check if the base candidate is available
  const baseExists = await existsCheck(candidate);
  if (!baseExists) {
    return candidate;
  }

  // Step 4 — Collision avoidance: append -2, -3, … up to -99
  for (let counter = 2; counter <= 99; counter++) {
    const suffixed = `${candidate}-${counter}`;
    const exists = await existsCheck(suffixed);
    if (!exists) {
      return suffixed;
    }
  }

  throw new Error(
    `generateDefaultSlug: could not find a unique slug for "${businessName}" after 99 attempts`
  );
}
