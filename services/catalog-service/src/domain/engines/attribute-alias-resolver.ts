/**
 * Attribute Alias Resolver
 *
 * Different sellers describe the same attribute using different labels.
 * This resolver maps vendor-specific attribute names to a canonical key
 * so that matching, description generation, and SEO work on uniform names.
 *
 * Rules:
 *  - Resolution is case-insensitive and whitespace-agnostic.
 *  - The canonical key is the preferred, human-readable name used in descriptions.
 *  - Unknown keys are returned as-is (after basic normalisation).
 */

/** Canonical key → list of known aliases (all lower-case, no extra spaces) */
const ALIAS_MAP: Record<string, string[]> = {
  storage: [
    'internal memory', 'rom', 'built-in storage', 'storage capacity',
    'internal storage', 'built in storage', 'onboard storage',
  ],
  ram: [
    'memory', 'system memory', 'ram memory', 'system ram',
  ],
  display: [
    'screen', 'screen size', 'display size', 'screen dimension',
  ],
  processor: [
    'cpu', 'chipset', 'chip', 'processor model', 'soc',
  ],
  battery: [
    'battery capacity', 'battery life', 'battery size',
  ],
  camera: [
    'main camera', 'rear camera', 'back camera', 'primary camera',
  ],
  weight: [
    'net weight', 'product weight', 'item weight',
  ],
  volume: [
    'capacity', 'net volume', 'size', 'content',
  ],
  warranty: [
    'warranty period', 'guarantee', 'guarantee period', 'product warranty',
  ],
  color: [
    'colour', 'product color', 'product colour', 'finish',
  ],
  material: [
    'construction material', 'made of', 'body material',
  ],
  dimensions: [
    'size', 'product dimensions', 'measurements', 'product size',
  ],
};

/** Reverse lookup: alias → canonical key */
const REVERSE_MAP = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
  for (const alias of aliases) {
    REVERSE_MAP.set(alias, canonical);
  }
  // The canonical key also resolves to itself
  REVERSE_MAP.set(canonical, canonical);
}

export class AttributeAliasResolver {
  /**
   * Returns the canonical attribute key for a given input name.
   * If no alias match is found, the input is returned normalised.
   *
   * @example
   * resolve('Internal Memory')  // → 'storage'
   * resolve('RAM')               // → 'ram'
   * resolve('Weight')            // → 'weight'
   * resolve('custom_field')      // → 'custom_field'
   */
  static resolve(attributeName: string): string {
    if (!attributeName) return attributeName;
    const normalised = attributeName.toLowerCase().trim().replace(/\s+/g, ' ');
    return REVERSE_MAP.get(normalised) ?? normalised.replace(/\s+/g, '_');
  }

  /**
   * Resolves all keys in a seller attribute map to their canonical equivalents.
   * Where multiple input keys resolve to the same canonical key, the first
   * non-empty value wins (sellers may submit both 'RAM' and 'memory'; first wins).
   */
  static resolveAll(attributes: Record<string, string>): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const [key, value] of Object.entries(attributes)) {
      const canonical = this.resolve(key);
      if (!resolved[canonical] && value?.trim()) {
        resolved[canonical] = value;
      }
    }
    return resolved;
  }

  /**
   * Returns true if two attribute names refer to the same canonical concept.
   */
  static areSynonyms(a: string, b: string): boolean {
    return this.resolve(a) === this.resolve(b);
  }

  /**
   * Returns all known aliases for a canonical key (or empty array if unknown).
   */
  static getAliases(canonicalKey: string): string[] {
    return ALIAS_MAP[canonicalKey.toLowerCase()] ?? [];
  }

  /**
   * Returns the full canonical → aliases map for inspection or seeding purposes.
   */
  static getAliasMap(): Readonly<Record<string, string[]>> {
    return ALIAS_MAP;
  }
}
