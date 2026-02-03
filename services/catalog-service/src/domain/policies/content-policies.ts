/**
 * Content Policies - Configuration-Driven Product Content Validation Rules
 * Volatile content validation rules with versioning and DSL support
 * Pure domain logic - no external dependencies
 */

export interface ContentRule {
  id: string;
  name: string;
  version: string;
  priority: number;
  condition: ContentCondition;
  action: ContentAction;
  enabled: boolean;
  metadata: {
    description: string;
    createdAt: Date;
    updatedAt: Date;
    author: string;
  };
}

export interface ContentCondition {
  type: 'content_length' | 'keyword_presence' | 'quality_score' | 'spam_indicators' | 'prohibited_content' | 'completeness' | 'readability' | 'uniqueness';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'not_contains' | 'matches_regex';
  value: any;
  and?: ContentCondition[];
  or?: ContentCondition[];
}

export interface ContentAction {
  type: 'approve' | 'reject' | 'flag_for_review' | 'suggest_improvements' | 'auto_correct' | 'require_changes';
  value: string;
  reason: string;
  suggestions?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ContentContext {
  productId: string;
  sellerId: string;
  title: string;
  description: string;
  shortDescription?: string;
  tags: string[];
  category: string;
  productType: string;
  images: Array<{
    url: string;
    altText?: string;
    size: number;
  }>;
  specifications?: Record<string, string>;
  sellerRating: number;
  sellerHistory: {
    violations: number;
    approvedProducts: number;
    rejectedProducts: number;
  };
  language: string;
  marketSegment: string;
}

export interface ContentValidationResult {
  appliedRules: string[];
  overallScore: number;
  qualityMetrics: {
    completeness: number; // 0-100
    readability: number; // 0-100
    uniqueness: number; // 0-100
    compliance: number; // 0-100
  };
  issues: Array<{
    ruleId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    suggestions: string[];
  }>;
  recommendations: Array<{
    type: 'improvement' | 'correction' | 'addition';
    description: string;
    priority: number;
  }>;
  canPublish: boolean;
  confidence: number;
}

export class ContentRuleEngine {
  constructor(private rules: ContentRule[] = []) {}

  addRule(rule: ContentRule): void {
    this.rules = this.rules.filter(r => r.id !== rule.id);
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  getRule(ruleId: string): ContentRule | undefined {
    return this.rules.find(r => r.id === ruleId);
  }

  getAllRules(): ContentRule[] {
    return [...this.rules];
  }

  validateContent(context: ContentContext): ContentValidationResult {
    const appliedRules: string[] = [];
    const issues: Array<{
      ruleId: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      suggestions: string[];
    }> = [];
    const recommendations: Array<{
      type: 'improvement' | 'correction' | 'addition';
      description: string;
      priority: number;
    }> = [];

    let canPublish = true;
    let totalScore = 0;
    let ruleCount = 0;

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.evaluateCondition(rule.condition, context)) {
        appliedRules.push(rule.id);

        const result = this.executeAction(rule.action, context);
        if (result.blocking) {
          canPublish = false;
        }

        if (result.issue) {
          issues.push(result.issue);
        }

        if (result.recommendations) {
          recommendations.push(...result.recommendations);
        }

        totalScore += rule.priority;
        ruleCount++;
      }
    }

    const qualityMetrics = this.calculateQualityMetrics(context);
    const overallScore = this.calculateOverallScore(qualityMetrics, issues);
    const confidence = ruleCount > 0 ? Math.min(totalScore / ruleCount / 10, 1.0) : 0.5;

    return {
      appliedRules,
      overallScore,
      qualityMetrics,
      issues,
      recommendations,
      canPublish,
      confidence
    };
  }

  private evaluateCondition(condition: ContentCondition, context: ContentContext): boolean {
    const fieldValue = this.getFieldValue(condition.type, context);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return fieldValue > condition.value;
      case 'less_than':
        return fieldValue < condition.value;
      case 'between':
        return fieldValue >= condition.value[0] && fieldValue <= condition.value[1];
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'matches_regex':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: ContentContext): any {
    switch (field) {
      case 'content_length':
        return context.description.length;
      case 'keyword_presence':
        return context.title + ' ' + context.description;
      case 'quality_score':
        return this.calculateQualityScore(context);
      case 'spam_indicators':
        return this.detectSpamIndicators(context);
      case 'prohibited_content':
        return context.title + ' ' + context.description + ' ' + context.tags.join(' ');
      case 'completeness':
        return this.calculateCompleteness(context);
      case 'readability':
        return this.calculateReadability(context.description);
      case 'uniqueness':
        return this.calculateUniqueness(context);
      default:
        return null;
    }
  }

  private executeAction(action: ContentAction, context: ContentContext): {
    blocking: boolean;
    issue?: any;
    recommendations?: any[];
  } {
    switch (action.type) {
      case 'reject':
        return {
          blocking: true,
          issue: {
            ruleId: 'content_validation',
            severity: action.severity,
            message: action.reason,
            suggestions: action.suggestions || []
          }
        };

      case 'flag_for_review':
        return {
          blocking: false,
          issue: {
            ruleId: 'content_validation',
            severity: action.severity,
            message: action.reason,
            suggestions: action.suggestions || []
          }
        };

      case 'suggest_improvements':
        return {
          blocking: false,
          recommendations: [{
            type: 'improvement' as const,
            description: action.reason,
            priority: action.severity === 'high' ? 3 : action.severity === 'medium' ? 2 : 1
          }]
        };

      case 'require_changes':
        return {
          blocking: true,
          issue: {
            ruleId: 'content_validation',
            severity: action.severity,
            message: action.reason,
            suggestions: action.suggestions || []
          }
        };

      default:
        return { blocking: false };
    }
  }

  private calculateQualityScore(context: ContentContext): number {
    let score = 100;

    // Title quality
    if (context.title.length < 10 || context.title.length > 80) score -= 10;
    if (context.title === context.title.toUpperCase()) score -= 15;

    // Description quality
    if (context.description.length < 50) score -= 20;
    if (context.description.length > 5000) score -= 5;

    // Tag quality
    if (context.tags.length === 0) score -= 15;
    if (context.tags.length > 20) score -= 10;

    // Image quality
    if (context.images.length === 0) score -= 25;
    if (context.images.some(img => !img.altText)) score -= 5;

    return Math.max(0, score);
  }

  private detectSpamIndicators(context: ContentContext): number {
    const spamWords = ['buy now', 'limited time', 'urgent', 'free shipping', 'guaranteed', 'amazing deal'];
    const content = (context.title + ' ' + context.description).toLowerCase();

    let spamScore = 0;
    for (const word of spamWords) {
      if (content.includes(word)) spamScore += 10;
    }

    // Excessive capitalization
    const capsRatio = (context.title.match(/[A-Z]/g) || []).length / context.title.length;
    if (capsRatio > 0.5) spamScore += 20;

    return spamScore;
  }

  private calculateCompleteness(context: ContentContext): number {
    let completeness = 0;
    const maxScore = 100;

    if (context.title) completeness += 20;
    if (context.description && context.description.length > 50) completeness += 25;
    if (context.shortDescription) completeness += 10;
    if (context.tags.length > 0) completeness += 10;
    if (context.images.length > 0) completeness += 15;
    if (context.specifications && Object.keys(context.specifications).length > 0) completeness += 10;
    if (context.category) completeness += 10;

    return Math.min(maxScore, completeness);
  }

  private calculateReadability(text: string): number {
    if (!text || text.length === 0) return 0;

    // Simple readability score based on sentence and word complexity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = words.reduce((sum, word) => sum + this.countSyllables(word), 0) / words.length;

    // Flesch Reading Ease formula (simplified)
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let syllableCount = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        syllableCount++;
      }
      previousWasVowel = isVowel;
    }

    // Adjust for silent 'e'
    if (word.endsWith('e')) syllableCount--;

    return Math.max(1, syllableCount);
  }

  private calculateUniqueness(context: ContentContext): number {
    // Simplified uniqueness check - would normally use external services
    const duplicateWords = this.findDuplicateWords(context.description);
    const uniquenessPenalty = duplicateWords.length * 2;

    return Math.max(0, 100 - uniquenessPenalty);
  }

  private findDuplicateWords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();

    for (const word of words) {
      if (word.length > 3) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }

    return Array.from(wordCount.entries())
      .filter(([, count]) => count > 3)
      .map(([word]) => word);
  }

  private calculateQualityMetrics(context: ContentContext): ContentValidationResult['qualityMetrics'] {
    return {
      completeness: this.calculateCompleteness(context),
      readability: this.calculateReadability(context.description),
      uniqueness: this.calculateUniqueness(context),
      compliance: this.calculateComplianceScore(context)
    };
  }

  private calculateComplianceScore(context: ContentContext): number {
    let score = 100;

    // Seller history penalties
    score -= context.sellerHistory.violations * 10;
    score -= (context.sellerHistory.rejectedProducts / Math.max(context.sellerHistory.approvedProducts + context.sellerHistory.rejectedProducts, 1)) * 20;

    // Content compliance checks
    const prohibitedWords = ['illegal', 'stolen', 'counterfeit'];
    const content = (context.title + ' ' + context.description).toLowerCase();

    for (const word of prohibitedWords) {
      if (content.includes(word)) score -= 50;
    }

    return Math.max(0, score);
  }

  private calculateOverallScore(metrics: ContentValidationResult['qualityMetrics'], issues: any[]): number {
    const baseScore = (
      metrics.completeness * 0.3 +
      metrics.readability * 0.2 +
      metrics.uniqueness * 0.2 +
      metrics.compliance * 0.3
    );

    // Penalty for critical issues
    const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
    const penalty = criticalIssues * 20;

    return Math.max(0, Math.min(100, baseScore - penalty));
  }
}

export class ContentPolicyDSL {
  static createRule(config: {
    id: string;
    name: string;
    version?: string;
    priority?: number;
    condition: ContentCondition;
    action: ContentAction;
    description?: string;
    author?: string;
  }): ContentRule {
    return {
      id: config.id,
      name: config.name,
      version: config.version || '1.0.0',
      priority: config.priority || 1,
      condition: config.condition,
      action: config.action,
      enabled: true,
      metadata: {
        description: config.description || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: config.author || 'system'
      }
    };
  }

  static condition(type: ContentCondition['type'], operator: ContentCondition['operator'], value: any): ContentCondition {
    return { type, operator, value };
  }

  static and(...conditions: ContentCondition[]): ContentCondition {
    return { type: conditions[0].type, operator: conditions[0].operator, value: conditions[0].value, and: conditions };
  }

  static or(...conditions: ContentCondition[]): ContentCondition {
    return { type: conditions[0].type, operator: conditions[0].operator, value: conditions[0].value, or: conditions };
  }

  static action(type: ContentAction['type'], value: string, reason: string, severity?: ContentAction['severity'], suggestions?: string[]): ContentAction {
    return { type, value, reason, severity: severity || 'medium', suggestions };
  }
}

// Pre-configured common content validation rules
export const DEFAULT_CONTENT_RULES: ContentRule[] = [
  // Critical content rejection
  ContentPolicyDSL.createRule({
    id: 'prohibited_content_rejection',
    name: 'Prohibited Content Rejection',
    priority: 25,
    condition: ContentPolicyDSL.condition('prohibited_content', 'contains', 'illegal'),
    action: ContentPolicyDSL.action('reject', 'blocked', 'Content contains prohibited terms', 'critical'),
    description: 'Reject content containing prohibited keywords'
  }),

  // Minimum content requirements
  ContentPolicyDSL.createRule({
    id: 'minimum_content_length',
    name: 'Minimum Content Length',
    priority: 20,
    condition: ContentPolicyDSL.condition('content_length', 'less_than', 50),
    action: ContentPolicyDSL.action('require_changes', 'insufficient', 'Description too short - minimum 50 characters required', 'high', ['Add detailed product specifications', 'Include usage instructions', 'Describe key features and benefits']),
    description: 'Enforce minimum content length requirements'
  }),

  // Spam content detection
  ContentPolicyDSL.createRule({
    id: 'spam_content_detection',
    name: 'Spam Content Detection',
    priority: 18,
    condition: ContentPolicyDSL.condition('spam_indicators', 'greater_than', 30),
    action: ContentPolicyDSL.action('flag_for_review', 'spam_suspected', 'Content shows spam indicators', 'high', ['Remove excessive promotional language', 'Use natural, descriptive text']),
    description: 'Detect and flag potential spam content'
  }),

  // Quality improvement suggestions
  ContentPolicyDSL.createRule({
    id: 'quality_improvement_suggestions',
    name: 'Quality Improvement Suggestions',
    priority: 10,
    condition: ContentPolicyDSL.condition('quality_score', 'less_than', 70),
    action: ContentPolicyDSL.action('suggest_improvements', 'quality_improve', 'Content quality can be improved', 'medium', ['Add more specific details', 'Include product specifications', 'Use proper grammar and formatting']),
    description: 'Provide suggestions for content quality improvement'
  }),

  // Readability check
  ContentPolicyDSL.createRule({
    id: 'readability_check',
    name: 'Readability Check',
    priority: 8,
    condition: ContentPolicyDSL.condition('readability', 'less_than', 40),
    action: ContentPolicyDSL.action('suggest_improvements', 'readability', 'Content may be difficult to read', 'low', ['Use shorter sentences', 'Simplify complex terms', 'Break up long paragraphs']),
    description: 'Check content readability and suggest improvements'
  }),

  // Completeness validation
  ContentPolicyDSL.createRule({
    id: 'content_completeness_check',
    name: 'Content Completeness Check',
    priority: 15,
    condition: ContentPolicyDSL.condition('completeness', 'less_than', 60),
    action: ContentPolicyDSL.action('require_changes', 'incomplete', 'Product listing incomplete', 'medium', ['Add product images', 'Include detailed description', 'Add relevant tags']),
    description: 'Ensure product listings are complete'
  }),

  // Uniqueness validation
  ContentPolicyDSL.createRule({
    id: 'content_uniqueness_check',
    name: 'Content Uniqueness Check',
    priority: 12,
    condition: ContentPolicyDSL.condition('uniqueness', 'less_than', 70),
    action: ContentPolicyDSL.action('suggest_improvements', 'uniqueness', 'Content appears repetitive', 'low', ['Use varied vocabulary', 'Avoid repeating phrases', 'Add unique details']),
    description: 'Check for content uniqueness and originality'
  })
];
