/**
 * Description Validation Policy
 * Validates product descriptions against business rules
 */

export interface DescriptionValidationResult {
  isValid: boolean;
  violatedRules: string[];
  suggestions: string[];
}

export class DescriptionValidationPolicy {
  private static readonly MIN_LENGTH = 120;
  private static readonly MAX_LENGTH = 5000;

  static validate(
    description: string,
    productName: string,
    categoryKeywords: string[]
  ): DescriptionValidationResult {
    const violatedRules: string[] = [];
    const suggestions: string[] = [];

    // Rule 1: Minimum length
    if (description.length < this.MIN_LENGTH) {
      violatedRules.push(
        `Description must be at least ${this.MIN_LENGTH} characters (current: ${description.length})`
      );
    }

    // Rule 2: Maximum length
    if (description.length > this.MAX_LENGTH) {
      violatedRules.push(
        `Description must not exceed ${this.MAX_LENGTH} characters (current: ${description.length})`
      );
    }

    // Rule 3: Must contain product name
    if (!this.containsProductName(description, productName)) {
      violatedRules.push('Description must contain the product name');
      suggestions.push(`Add "${productName}" to the description`);
    }

    // Rule 4: Must contain at least one category keyword
    if (!this.containsCategoryKeyword(description, categoryKeywords)) {
      violatedRules.push(
        `Description must contain at least one category keyword: ${categoryKeywords.join(', ')}`
      );
      suggestions.push(`Add one of these keywords: ${categoryKeywords.join(', ')}`);
    }

    // Rule 5: Must contain specifications block
    if (!this.containsSpecificationsBlock(description)) {
      violatedRules.push('Description must contain a specifications or features section');
      suggestions.push('Add a specifications or features section to the description');
    }

    // Rule 6: No excessive repetition
    if (this.hasExcessiveRepetition(description)) {
      violatedRules.push('Description contains excessive word repetition');
      suggestions.push('Reduce repetition of words and phrases');
    }

    return {
      isValid: violatedRules.length === 0,
      violatedRules,
      suggestions,
    };
  }

  private static containsProductName(description: string, productName: string): boolean {
    const lowerDesc = description.toLowerCase();
    const lowerName = productName.toLowerCase();

    // Check for exact match or partial match
    return (
      lowerDesc.includes(lowerName) ||
      lowerDesc.includes(productName.split(' ')[0].toLowerCase())
    );
  }

  private static containsCategoryKeyword(description: string, keywords: string[]): boolean {
    const lowerDesc = description.toLowerCase();

    return keywords.some(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      return lowerDesc.includes(lowerKeyword);
    });
  }

  private static containsSpecificationsBlock(description: string): boolean {
    const specKeywords = [
      'specification',
      'feature',
      'technical',
      'dimension',
      'weight',
      'material',
      'color',
      'size',
      'capacity',
      'warranty',
    ];

    const lowerDesc = description.toLowerCase();

    return specKeywords.some(keyword => lowerDesc.includes(keyword));
  }

  private static hasExcessiveRepetition(description: string): boolean {
    const words = description.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};

    for (const word of words) {
      if (word.length > 3) {
        // Only count words longer than 3 characters
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    // Check if any word appears more than 5 times
    return Object.values(wordFreq).some(count => count > 5);
  }

  static getMinimumLength(): number {
    return this.MIN_LENGTH;
  }

  static getMaximumLength(): number {
    return this.MAX_LENGTH;
  }

  static getRecommendedLength(): number {
    return Math.floor((this.MIN_LENGTH + this.MAX_LENGTH) / 2);
  }
}
