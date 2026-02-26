/**
 * Message Content Value Object
 * Validates and manages SMS message content with encoding and segmentation
 */

export type MessageEncoding = 'GSM-7' | 'UCS-2';

export class MessageContent {
    private readonly value: string;
    private readonly encoding: MessageEncoding;
    private readonly segmentCount: number;

    // GSM-7 character set (basic)
    private static readonly GSM7_BASIC = new Set([
        '@', '£', '$', '¥', 'è', 'é', 'ù', 'ì', 'ò', 'Ç', '\n', 'Ø', 'ø', '\r', 'Å', 'å',
        'Δ', '_', 'Φ', 'Γ', 'Λ', 'Ω', 'Π', 'Ψ', 'Σ', 'Θ', 'Ξ', 'Æ', 'æ', 'ß', 'É',
        ' ', '!', '"', '#', '¤', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?',
        '¡', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
        'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Ä', 'Ö', 'Ñ', 'Ü', '§',
        '¿', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
        'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ä', 'ö', 'ñ', 'ü', 'à'
    ]);

    // Extended GSM-7 characters (count as 2 characters)
    private static readonly GSM7_EXTENDED = new Set([
        '|', '^', '€', '{', '}', '[', ']', '~', '\\'
    ]);

    private constructor(content: string, encoding: MessageEncoding, segmentCount: number) {
        this.value = content;
        this.encoding = encoding;
        this.segmentCount = segmentCount;
    }

    static create(content: string): MessageContent {
        const sanitized = this.sanitize(content);
        this.validate(sanitized);

        const encoding = this.detectEncoding(sanitized);
        const segmentCount = this.calculateSegments(sanitized, encoding);

        return new MessageContent(sanitized, encoding, segmentCount);
    }

    private static sanitize(content: string): string {
        // Trim whitespace
        let sanitized = content.trim();

        // Replace multiple spaces with single space
        sanitized = sanitized.replace(/\s+/g, ' ');

        // Remove null bytes and other control characters (except newline and carriage return)
        sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');

        return sanitized;
    }

    private static validate(content: string): void {
        if (!content || content.length === 0) {
            throw new Error('Message content cannot be empty');
        }

        // Maximum length for concatenated SMS (10 segments)
        const maxLength = 1530; // 153 chars per segment * 10 segments
        if (content.length > maxLength) {
            throw new Error(
                `Message too long: ${content.length} characters. Maximum is ${maxLength} characters`
            );
        }
    }

    private static detectEncoding(content: string): MessageEncoding {
        // Check if all characters are in GSM-7 character set
        for (const char of content) {
            if (!this.GSM7_BASIC.has(char) && !this.GSM7_EXTENDED.has(char)) {
                return 'UCS-2'; // Unicode encoding needed
            }
        }
        return 'GSM-7';
    }

    private static calculateSegments(content: string, encoding: MessageEncoding): number {
        let charCount = content.length;

        if (encoding === 'GSM-7') {
            // Count extended characters as 2
            for (const char of content) {
                if (this.GSM7_EXTENDED.has(char)) {
                    charCount++;
                }
            }

            // Single SMS: 160 chars, Concatenated: 153 chars per segment
            if (charCount <= 160) return 1;
            return Math.ceil(charCount / 153);
        } else {
            // UCS-2 encoding
            // Single SMS: 70 chars, Concatenated: 67 chars per segment
            if (charCount <= 70) return 1;
            return Math.ceil(charCount / 67);
        }
    }

    getValue(): string {
        return this.value;
    }

    getEncoding(): MessageEncoding {
        return this.encoding;
    }

    getSegmentCount(): number {
        return this.segmentCount;
    }

    getLength(): number {
        return this.value.length;
    }

    /**
     * Get effective character count (considering extended GSM-7 chars)
     */
    getEffectiveLength(): number {
        if (this.encoding === 'UCS-2') {
            return this.value.length;
        }

        let count = this.value.length;
        for (const char of this.value) {
            if (MessageContent.GSM7_EXTENDED.has(char)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Check if message will be concatenated
     */
    isConcatenated(): boolean {
        return this.segmentCount > 1;
    }

    /**
     * Get remaining characters for current segment
     */
    getRemainingChars(): number {
        const maxSingleSegment = this.encoding === 'GSM-7' ? 160 : 70;
        const maxConcatSegment = this.encoding === 'GSM-7' ? 153 : 67;

        const effectiveLength = this.getEffectiveLength();

        if (effectiveLength <= maxSingleSegment) {
            return maxSingleSegment - effectiveLength;
        }

        const currentSegmentUsed = effectiveLength % maxConcatSegment;
        return maxConcatSegment - currentSegmentUsed;
    }

    equals(other: MessageContent): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }
}
