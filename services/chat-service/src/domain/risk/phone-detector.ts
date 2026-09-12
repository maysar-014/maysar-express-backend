// ─────────────────────────────────────────────────────────────────────────────
// Tanzanian phone-number detection (context-aware).
//
// Recognizes national and international Tanzanian mobile formats, with variable
// separators and obfuscation:
//   0712345678 | 0620123456 | 0655123456
//   0712 345 678 | 0712-345-678 | 0712.345.678 | (0712) 345 678
//   +255712345678 | +255 712 345 678 | 255712345678 | 255 712 345 678
//   +712345678 (trunk shorthand)
//   0 7 1 2 3 4 5 6 7 8                       (spaced digits)
//   zero seven one two three four five six seven eight   (spelled digits)
//
// Validation is strict enough not to treat generic account/reference numbers
// as phones: the digit sequence must structurally match a Tanzanian mobile
// number (leading trunk 0[67] + 9 digits, or +255/[67] + 9 digits).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keywords that suggest a phone number is being shared to move the
 * conversation off the platform.
 */
export const PHONE_CONTACT_INTENT_RE =
  /\b(whatsapp|watsapp|wa\s*\.?\s*me|telegram|imo|signal|call|piga\s*simu|nitafute|sms|text\s*me|nipe\s*(?:namba|number)|namba\s+(?:yangu|yako|ni|we)|(?:my|your|our)\s+(?:phone\s*)?number)\b/i;

/**
 * Keywords that suggest a phone number is being used to arrange payment
 * outside the platform (mobile money, deposits, bank details).
 */
export const PHONE_PAYMENT_INTENT_RE =
  /\b(m[- ]?pesa|tigo\s*pesa|airtel\s*money|halopesa|m[- ]?pawa|deposit|lipa|malipo|tuma\s*pesa|pesa|\bpin\b|mfumo|bank|account|receive\s*money|money)\b/i;

export const PHONE_CONTEXT_CATEGORIES = new Set([
  "off_platform_contact",
  "tanzania_mobile_money",
  "off_platform_payment",
  "advance_fee",
  "financial_details",
  "card_fraud",
]);

const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

const NUMBER_WORD_RE =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)\b/gi;

/**
 * Replaces spelled-out digits ("zero seven one…") with their numeric form so
 * the candidate extractor can work on them too.
 */
export function expandNumberWords(text: string): string {
  return text.replace(
    NUMBER_WORD_RE,
    (word) => NUMBER_WORDS[word.toLowerCase()] ?? word,
  );
}

// Matches a chunk that could be a phone: optional +/leading 0/255, then digits
// with separators (spaces, dashes, dots, parens, slashes). Used to pull
// candidates out of free text before strict validation.
const PHONE_CANDIDATE_RE = /[+]?[0-9][0-9\s.()/-]*/g;

const NATIONAL_PHONE_RE = /^0[67]\d{8}$/;
const INTERNATIONAL_PHONE_RE = /^255[67]\d{8}$/;
const TRUNK_SHORTHAND_RE = /^[67]\d{8}$/;

/**
 * Detects Tanzanian mobile phone numbers in a message and returns their
 * canonical form ("0712…" national or "+255712…" international).
 *
 * Strict structural validation avoids false positives from bank accounts or
 * reference numbers — generic 10–12 digit sequences that do not match the
 * `0[67]` / `255[67]` mobile trunk pattern are not treated as phones.
 */
export function detectPhoneNumbers(content: string): string[] {
  if (!content) return [];

  // Remove URLs first so digit sequences inside links are never read as phones.
  const withoutUrls = content.replace(/https?:\/\/\S+/gi, " ");
  const expanded = expandNumberWords(withoutUrls);
  const candidates = expanded.match(PHONE_CANDIDATE_RE) ?? [];

  const found: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    try {
      let canonical: string | null = null;
      if (digits.length === 10 && NATIONAL_PHONE_RE.test(digits)) {
        canonical = digits; // 0712345678
      } else if (digits.length === 12 && INTERNATIONAL_PHONE_RE.test(digits)) {
        canonical = `+${digits}`; // +255712345678
      } else if (digits.length === 9 && TRUNK_SHORTHAND_RE.test(digits)) {
        const trimmed = candidate.trim();
        if (trimmed.startsWith("+") || /^\+/.test(trimmed)) {
          canonical = `+255${digits}`; // +712345678
        }
      }

      if (canonical && !seen.has(canonical)) {
        seen.add(canonical);
        found.push(canonical);
      }
    } catch {
      // ignore malformed candidates
    }
  }

  return found;
}
