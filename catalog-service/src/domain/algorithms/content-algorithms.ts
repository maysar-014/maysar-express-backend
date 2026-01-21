/**
 * Content Algorithms
 * Pure algorithmic implementations for content analysis and quality assessment
 * No external dependencies - pure mathematical computations
 */

export interface ContentDocument {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  language: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentAnalysis {
  documentId: string;
  qualityMetrics: {
    completeness: number; // 0-100
    readability: number; // 0-100
    uniqueness: number; // 0-100
    engagement: number; // 0-100
    seoScore: number; // 0-100
  };
  textStatistics: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    averageWordsPerSentence: number;
    averageSentencesPerParagraph: number;
    readingTime: number; // minutes
  };
  readabilityScores: {
    fleschReadingEase: number;
    gunningFogIndex: number;
    colemanLiauIndex: number;
    automatedReadabilityIndex: number;
    smogIndex: number;
  };
  contentIssues: Array<{
    type: 'spelling' | 'grammar' | 'style' | 'seo' | 'accessibility';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestion: string;
    position?: { start: number; end: number };
  }>;
  seoAnalysis: {
    titleOptimization: number;
    keywordDensity: Map<string, number>;
    metaDescriptionScore: number;
    headingStructure: number;
    internalLinking: number;
    externalLinking: number;
  };
  sentimentAnalysis: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    sentimentScore: number; // -1 to 1
    confidence: number;
  };
}

/**
 * Readability Analysis Algorithm
 * Calculates various readability metrics for content assessment
 */
export class ReadabilityAlgorithm {
  analyzeReadability(text: string): {
    fleschReadingEase: number;
    gunningFogIndex: number;
    colemanLiauIndex: number;
    automatedReadabilityIndex: number;
    smogIndex: number;
  } {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) {
      return {
        fleschReadingEase: 0,
        gunningFogIndex: 0,
        colemanLiauIndex: 0,
        automatedReadabilityIndex: 0,
        smogIndex: 0
      };
    }

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    const percentageComplexWords = (words.filter(word => this.countSyllables(word) >= 3).length / words.length) * 100;

    // Flesch Reading Ease
    const fleschReadingEase = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    // Gunning Fog Index
    const gunningFogIndex = 0.4 * (avgSentenceLength + percentageComplexWords);

    // Coleman-Liau Index
    const colemanLiauIndex = (0.0588 * (words.length / sentences.length * 100)) -
                            (0.296 * (syllables / words.length * 100)) - 15.8;

    // Automated Readability Index
    const characters = text.replace(/\s+/g, '').length;
    const automatedReadabilityIndex = (4.71 * (characters / words.length)) +
                                     (0.5 * (words.length / sentences.length)) - 21.43;

    // SMOG Index (simplified)
    const smogIndex = 1.043 * Math.sqrt(percentageComplexWords * (sentences.length / 30)) + 3.1291;

    return {
      fleschReadingEase: Math.max(0, Math.min(100, fleschReadingEase)),
      gunningFogIndex: Math.max(0, gunningFogIndex),
      colemanLiauIndex: Math.max(0, colemanLiauIndex),
      automatedReadabilityIndex: Math.max(0, automatedReadabilityIndex),
      smogIndex: Math.max(0, smogIndex)
    };
  }

  getReadabilityLevel(score: number, metric: string): {
    level: 'very_easy' | 'easy' | 'fairly_easy' | 'standard' | 'fairly_difficult' | 'difficult' | 'very_difficult';
    grade: string;
    description: string;
  } {
    switch (metric) {
      case 'fleschReadingEase':
        if (score >= 90) return { level: 'very_easy', grade: '5th grade', description: 'Very easy to read' };
        if (score >= 80) return { level: 'easy', grade: '6th grade', description: 'Easy to read' };
        if (score >= 70) return { level: 'fairly_easy', grade: '7th grade', description: 'Fairly easy to read' };
        if (score >= 60) return { level: 'standard', grade: '8th-9th grade', description: 'Standard readability' };
        if (score >= 50) return { level: 'fairly_difficult', grade: '10th-12th grade', description: 'Fairly difficult to read' };
        if (score >= 30) return { level: 'difficult', grade: 'College', description: 'Difficult to read' };
        return { level: 'very_difficult', grade: 'College graduate', description: 'Very difficult to read' };

      case 'gunningFogIndex':
        if (score <= 6) return { level: 'very_easy', grade: '6th grade', description: 'Very easy to read' };
        if (score <= 9) return { level: 'easy', grade: '9th grade', description: 'Easy to read' };
        if (score <= 12) return { level: 'fairly_easy', grade: 'High school', description: 'Fairly easy to read' };
        if (score <= 15) return { level: 'standard', grade: 'College', description: 'Standard readability' };
        if (score <= 18) return { level: 'fairly_difficult', grade: 'College graduate', description: 'Fairly difficult to read' };
        return { level: 'difficult', grade: 'Professional', description: 'Very difficult to read' };

      default:
        return { level: 'standard', grade: 'Unknown', description: 'Standard readability' };
    }
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

    // Adjust for final 'le'
    if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) {
      syllableCount++;
    }

    return Math.max(1, syllableCount);
  }
}

/**
 * Content Quality Assessment Algorithm
 * Evaluates overall content quality using multiple metrics
 */
export class ContentQualityAlgorithm {
  assessQuality(document: ContentDocument, corpus?: ContentDocument[]): ContentAnalysis['qualityMetrics'] {
    return {
      completeness: this.calculateCompleteness(document),
      readability: this.calculateReadabilityScore(document),
      uniqueness: this.calculateUniqueness(document, corpus),
      engagement: this.calculateEngagementPotential(document),
      seoScore: this.calculateSEOQuality(document)
    };
  }

  private calculateCompleteness(document: ContentDocument): number {
    let completeness = 0;
    const maxScore = 100;

    // Required elements
    if (document.title && document.title.length > 0) completeness += 20;
    if (document.content && document.content.length >= 100) completeness += 25;
    if (document.summary && document.summary.length > 0) completeness += 10;
    if (document.tags && document.tags.length > 0) completeness += 10;
    if (document.author) completeness += 5;

    // Content depth
    const wordCount = document.content.split(/\s+/).length;
    if (wordCount >= 300) completeness += 15; // Substantial content
    else if (wordCount >= 150) completeness += 10; // Adequate content
    else if (wordCount >= 50) completeness += 5; // Basic content

    // Structure elements (headings, lists, etc.)
    const hasHeadings = /#{1,6}\s/.test(document.content);
    const hasLists = /^[\s]*[-*+]\s/m.test(document.content) || /^\s*\d+\.\s/m.test(document.content);

    if (hasHeadings) completeness += 5;
    if (hasLists) completeness += 5;

    return Math.min(maxScore, completeness);
  }

  private calculateReadabilityScore(document: ContentDocument): number {
    const readabilityAlgo = new ReadabilityAlgorithm();
    const scores = readabilityAlgo.analyzeReadability(document.content);

    // Weighted average of readability metrics
    const weightedScore = (
      scores.fleschReadingEase * 0.4 + // 40% weight on ease of reading
      (100 - scores.gunningFogIndex) * 0.3 + // 30% weight on fog index (inverted)
      (100 - scores.automatedReadabilityIndex) * 0.3 // 30% weight on ARI (inverted)
    );

    return Math.max(0, Math.min(100, weightedScore));
  }

  private calculateUniqueness(document: ContentDocument, corpus?: ContentDocument[]): number {
    if (!corpus || corpus.length === 0) return 100; // Assume unique if no corpus

    const docWords = new Set(document.content.toLowerCase().split(/\s+/));
    let totalSimilarity = 0;

    for (const otherDoc of corpus) {
      if (otherDoc.id === document.id) continue;

      const otherWords = new Set(otherDoc.content.toLowerCase().split(/\s+/));
      const intersection = new Set([...docWords].filter(x => otherWords.has(x)));
      const union = new Set([...docWords, ...otherWords]);

      const jaccardSimilarity = intersection.size / union.size;
      totalSimilarity += jaccardSimilarity;
    }

    const averageSimilarity = totalSimilarity / (corpus.length - 1);
    return Math.max(0, (1 - averageSimilarity) * 100);
  }

  private calculateEngagementPotential(document: ContentDocument): number {
    let engagement = 0;
    const maxScore = 100;

    // Question content (engages readers)
    const questionCount = (document.content.match(/\?/g) || []).length;
    engagement += Math.min(questionCount * 5, 20);

    // Call-to-action phrases
    const ctaPhrases = ['click here', 'learn more', 'find out', 'discover', 'see more', 'read on'];
    const ctaMatches = ctaPhrases.reduce((count, phrase) =>
      count + (document.content.toLowerCase().includes(phrase) ? 1 : 0), 0);
    engagement += Math.min(ctaMatches * 10, 25);

    // Interactive elements (lists, tips, etc.)
    const hasLists = /^[\s]*[-*+]\s/m.test(document.content);
    const hasNumbers = /^\s*\d+\.\s/m.test(document.content);
    if (hasLists || hasNumbers) engagement += 15;

    // Content length (longer content tends to engage better)
    const wordCount = document.content.split(/\s+/).length;
    if (wordCount >= 500) engagement += 20;
    else if (wordCount >= 300) engagement += 15;
    else if (wordCount >= 100) engagement += 10;

    // Personal tone
    const personalWords = ['you', 'your', 'we', 'our'];
    const personalCount = personalWords.reduce((count, word) =>
      count + (document.content.toLowerCase().split(/\s+/).filter(w => w === word).length), 0);
    engagement += Math.min(personalCount * 2, 20);

    return Math.min(maxScore, engagement);
  }

  private calculateSEOQuality(document: ContentDocument): number {
    let seoScore = 0;
    const maxScore = 100;

    // Title optimization
    if (document.title.length >= 30 && document.title.length <= 60) seoScore += 20;
    else if (document.title.length >= 20 && document.title.length <= 70) seoScore += 15;

    // Content length
    const wordCount = document.content.split(/\s+/).length;
    if (wordCount >= 300) seoScore += 15;
    else if (wordCount >= 150) seoScore += 10;

    // Keyword usage (simplified - assumes tags are keywords)
    if (document.tags && document.tags.length > 0) {
      const keywordInTitle = document.tags.some(tag =>
        document.title.toLowerCase().includes(tag.toLowerCase()));
      const keywordInContent = document.tags.some(tag =>
        document.content.toLowerCase().includes(tag.toLowerCase()));

      if (keywordInTitle) seoScore += 15;
      if (keywordInContent) seoScore += 10;
    }

    // Internal structure
    const hasHeadings = /#{1,6}\s/.test(document.content);
    const hasLinks = /\[.*?\]\(.*?\)/.test(document.content); // Markdown links

    if (hasHeadings) seoScore += 15;
    if (hasLinks) seoScore += 10;

    // Freshness (content updated recently)
    const daysSinceUpdate = (Date.now() - document.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= 30) seoScore += 10;
    else if (daysSinceUpdate <= 90) seoScore += 5;

    return Math.min(maxScore, seoScore);
  }
}

/**
 * Sentiment Analysis Algorithm
 * Analyzes emotional tone and sentiment in content
 */
export class SentimentAnalysisAlgorithm {
  analyzeSentiment(text: string): {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    sentimentScore: number; // -1 to 1
    confidence: number;
    emotionBreakdown: {
      joy: number;
      sadness: number;
      anger: number;
      fear: number;
      surprise: number;
    };
  } {
    const words = text.toLowerCase().split(/\s+/);

    // Simple sentiment lexicon (expanded version would use a proper lexicon)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'best', 'perfect', 'happy', 'joy', 'excited', 'awesome', 'brilliant'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'sad', 'angry', 'fear', 'scared', 'disappointed', 'frustrated', 'annoyed', 'upset', 'disgusted'];

    const emotionWords = {
      joy: ['happy', 'joy', 'excited', 'delighted', 'pleased', 'thrilled', 'ecstatic'],
      sadness: ['sad', 'unhappy', 'depressed', 'sorrow', 'grief', 'melancholy', 'disappointed'],
      anger: ['angry', 'mad', 'furious', 'irritated', 'annoyed', 'frustrated', 'rage'],
      fear: ['fear', 'scared', 'afraid', 'terrified', 'anxious', 'worried', 'nervous'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'unexpected', 'sudden']
    };

    let positiveCount = 0;
    let negativeCount = 0;
    const emotionCounts = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0
    };

    // Count sentiment and emotions
    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;

      for (const [emotion, emotionWordList] of Object.entries(emotionWords)) {
        if (emotionWordList.includes(word)) {
          emotionCounts[emotion as keyof typeof emotionCounts]++;
        }
      }
    }

    // Calculate sentiment score (-1 to 1)
    const totalSentimentWords = positiveCount + negativeCount;
    const sentimentScore = totalSentimentWords > 0
      ? (positiveCount - negativeCount) / totalSentimentWords
      : 0;

    // Determine overall sentiment
    let overallSentiment: 'positive' | 'neutral' | 'negative';
    if (sentimentScore > 0.1) overallSentiment = 'positive';
    else if (sentimentScore < -0.1) overallSentiment = 'negative';
    else overallSentiment = 'neutral';

    // Calculate confidence based on sentiment word density
    const confidence = Math.min(totalSentimentWords / Math.max(words.length * 0.1, 1), 1);

    // Normalize emotion counts to percentages
    const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
    const emotionBreakdown = {
      joy: totalEmotions > 0 ? emotionCounts.joy / totalEmotions : 0,
      sadness: totalEmotions > 0 ? emotionCounts.sadness / totalEmotions : 0,
      anger: totalEmotions > 0 ? emotionCounts.anger / totalEmotions : 0,
      fear: totalEmotions > 0 ? emotionCounts.fear / totalEmotions : 0,
      surprise: totalEmotions > 0 ? emotionCounts.surprise / totalEmotions : 0
    };

    return {
      overallSentiment,
      sentimentScore,
      confidence,
      emotionBreakdown
    };
  }
}

/**
 * Content Optimization Algorithm
 * Suggests improvements for better content quality and engagement
 */
export class ContentOptimizationAlgorithm {
  generateOptimizationSuggestions(analysis: ContentAnalysis): Array<{
    type: 'content' | 'structure' | 'seo' | 'engagement' | 'accessibility';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: number; // Expected improvement in quality score
    effort: 'low' | 'medium' | 'high';
  }> {
    const suggestions: Array<{
      type: 'content' | 'structure' | 'seo' | 'engagement' | 'accessibility';
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      impact: number;
      effort: 'low' | 'medium' | 'high';
    }> = [];

    // Quality-based suggestions
    if (analysis.qualityMetrics.completeness < 70) {
      suggestions.push({
        type: 'content',
        priority: 'high',
        title: 'Improve Content Completeness',
        description: 'Add more detailed information, examples, or explanations to make the content more comprehensive',
        impact: Math.max(10, 100 - analysis.qualityMetrics.completeness),
        effort: 'medium'
      });
    }

    if (analysis.qualityMetrics.readability < 60) {
      suggestions.push({
        type: 'content',
        priority: 'medium',
        title: 'Enhance Readability',
        description: 'Use shorter sentences, simpler words, and break up complex information for better readability',
        impact: Math.max(8, 80 - analysis.qualityMetrics.readability),
        effort: 'medium'
      });
    }

    if (analysis.qualityMetrics.seoScore < 70) {
      suggestions.push({
        type: 'seo',
        priority: 'high',
        title: 'Optimize for Search Engines',
        description: 'Improve title, add relevant keywords, and enhance content structure for better SEO',
        impact: Math.max(12, 100 - analysis.qualityMetrics.seoScore),
        effort: 'medium'
      });
    }

    // Structure suggestions
    if (analysis.textStatistics.paragraphCount < 3) {
      suggestions.push({
        type: 'structure',
        priority: 'low',
        title: 'Add Content Structure',
        description: 'Break content into logical paragraphs and sections for better organization',
        impact: 5,
        effort: 'low'
      });
    }

    // Engagement suggestions
    if (analysis.qualityMetrics.engagement < 50) {
      suggestions.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Increase Reader Engagement',
        description: 'Add questions, calls-to-action, or interactive elements to engage readers more effectively',
        impact: Math.max(10, 70 - analysis.qualityMetrics.engagement),
        effort: 'medium'
      });
    }

    // Issue-based suggestions
    for (const issue of analysis.contentIssues) {
      if (issue.severity === 'high' || issue.severity === 'critical') {
        suggestions.push({
          type: 'content',
          priority: issue.severity === 'critical' ? 'high' : 'medium',
          title: `Fix ${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)} Issue`,
          description: issue.suggestion,
          impact: issue.severity === 'critical' ? 15 : 8,
          effort: 'low'
        });
      }
    }

    // Sort by impact and priority
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : b.impact - a.impact;
    });
  }

  calculateImprovementPotential(analysis: ContentAnalysis): {
    potentialScore: number;
    achievableImprovement: number;
    topImprovements: string[];
  } {
    const currentScore = (
      analysis.qualityMetrics.completeness +
      analysis.qualityMetrics.readability +
      analysis.qualityMetrics.uniqueness +
      analysis.qualityMetrics.engagement +
      analysis.qualityMetrics.seoScore
    ) / 5;

    // Estimate potential improvement based on issues and suggestions
    let potentialImprovement = 0;

    // Completeness can often be improved significantly
    if (analysis.qualityMetrics.completeness < 80) {
      potentialImprovement += Math.min(25, 100 - analysis.qualityMetrics.completeness);
    }

    // Readability improvements
    if (analysis.qualityMetrics.readability < 70) {
      potentialImprovement += Math.min(20, 90 - analysis.qualityMetrics.readability);
    }

    // SEO improvements
    if (analysis.qualityMetrics.seoScore < 70) {
      potentialImprovement += Math.min(25, 100 - analysis.qualityMetrics.seoScore);
    }

    // Issue-based improvements
    const highSeverityIssues = analysis.contentIssues.filter(issue =>
      issue.severity === 'high' || issue.severity === 'critical'
    ).length;
    potentialImprovement += highSeverityIssues * 5;

    const potentialScore = Math.min(100, currentScore + potentialImprovement);
    const achievableImprovement = potentialScore - currentScore;

    // Top improvement areas
    const topImprovements: string[] = [];
    if (analysis.qualityMetrics.completeness < 80) topImprovements.push('Content completeness');
    if (analysis.qualityMetrics.readability < 70) topImprovements.push('Readability');
    if (analysis.qualityMetrics.seoScore < 70) topImprovements.push('SEO optimization');
    if (analysis.qualityMetrics.engagement < 60) topImprovements.push('Reader engagement');

    return {
      potentialScore: Math.round(potentialScore),
      achievableImprovement: Math.round(achievableImprovement),
      topImprovements
    };
  }
}

/**
 * Content Similarity Detection Algorithm
 * Identifies duplicate or very similar content across documents
 */
export class ContentSimilarityAlgorithm {
  calculateSimilarity(text1: string, text2: string): {
    similarity: number;
    method: string;
    details: {
      jaccardSimilarity: number;
      cosineSimilarity: number;
      longestCommonSubstring: number;
    };
  } {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    // Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    const jaccardSimilarity = intersection.size / union.size;

    // Cosine similarity using word frequency vectors
    const freq1 = this.getWordFrequencies(text1);
    const freq2 = this.getWordFrequencies(text2);
    const cosineSimilarity = this.cosineSimilarity(freq1, freq2);

    // Longest common substring ratio
    const longestCommonSubstring = this.longestCommonSubstring(text1.toLowerCase(), text2.toLowerCase());
    const lcsRatio = longestCommonSubstring.length / Math.min(text1.length, text2.length);

    // Weighted combination
    const similarity = (
      jaccardSimilarity * 0.4 +
      cosineSimilarity * 0.4 +
      lcsRatio * 0.2
    );

    return {
      similarity,
      method: 'hybrid',
      details: {
        jaccardSimilarity,
        cosineSimilarity,
        longestCommonSubstring: lcsRatio
      }
    };
  }

  findDuplicateContent(documents: ContentDocument[], threshold: number = 0.7): Array<{
    documentId1: string;
    documentId2: string;
    similarity: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const duplicates: Array<{
      documentId1: string;
      documentId2: string;
      similarity: number;
      riskLevel: 'low' | 'medium' | 'high';
    }> = [];

    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const similarity = this.calculateSimilarity(
          documents[i].content,
          documents[j].content
        ).similarity;

        if (similarity >= threshold) {
          let riskLevel: 'low' | 'medium' | 'high';
          if (similarity >= 0.9) riskLevel = 'high';
          else if (similarity >= 0.8) riskLevel = 'medium';
          else riskLevel = 'low';

          duplicates.push({
            documentId1: documents[i].id,
            documentId2: documents[j].id,
            similarity,
            riskLevel
          });
        }
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  private getWordFrequencies(text: string): Map<string, number> {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const frequencies = new Map<string, number>();

    for (const word of words) {
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    }

    return frequencies;
  }

  private cosineSimilarity(freq1: Map<string, number>, freq2: Map<string, number>): number {
    const commonWords = new Set([...freq1.keys(), ...freq2.keys()]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const word of commonWords) {
      const f1 = freq1.get(word) || 0;
      const f2 = freq2.get(word) || 0;

      dotProduct += f1 * f2;
      norm1 += f1 * f1;
      norm2 += f2 * f2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private longestCommonSubstring(str1: string, str2: string): string {
    const matrix = Array(str1.length + 1).fill(null).map(() => Array(str2.length + 1).fill(0));
    let longestLength = 0;
    let endIndex = 0;

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
          if (matrix[i][j] > longestLength) {
            longestLength = matrix[i][j];
            endIndex = i;
          }
        }
      }
    }

    return str1.substring(endIndex - longestLength, endIndex);
  }
}
