import {
  ContentAnalysis,
  ContentDocument,
  ContentOptimizationAlgorithm,
  ContentQualityAlgorithm,
  ContentSimilarityAlgorithm,
  ReadabilityAlgorithm,
  SentimentAnalysisAlgorithm
} from './content-algorithms';

function makeDocument(id: string, content: string): ContentDocument {
  const now = new Date('2026-03-08T00:00:00.000Z');
  return {
    id,
    title: `Title ${id}`,
    content,
    summary: `Summary ${id}`,
    tags: ['quality', 'seo'],
    language: 'en',
    author: 'author',
    createdAt: now,
    updatedAt: now
  };
}

describe('content-algorithms', () => {
  it('computes readability and handles empty text', () => {
    const algo = new ReadabilityAlgorithm();

    const empty = algo.analyzeReadability('');
    const nonEmpty = algo.analyzeReadability('This is a simple sentence. This is another one.');
    const level = algo.getReadabilityLevel(85, 'fleschReadingEase');

    expect(empty).toEqual({
      fleschReadingEase: 0,
      gunningFogIndex: 0,
      colemanLiauIndex: 0,
      automatedReadabilityIndex: 0,
      smogIndex: 0
    });
    expect(nonEmpty.fleschReadingEase).toBeGreaterThanOrEqual(0);
    expect(level.level).toBe('easy');
  });

  it('assesses quality and uniqueness against corpus', () => {
    const quality = new ContentQualityAlgorithm();
    const doc = makeDocument('doc-1', 'How to optimize product content with headings and details? # Guide');
    const similarDoc = makeDocument('doc-2', 'How to optimize product content with details and headings');

    const metrics = quality.assessQuality(doc, [doc, similarDoc]);

    expect(metrics.completeness).toBeGreaterThan(0);
    expect(metrics.readability).toBeGreaterThanOrEqual(0);
    expect(metrics.uniqueness).toBeLessThanOrEqual(100);
    expect(metrics.seoScore).toBeGreaterThanOrEqual(0);
  });

  it('extracts sentiment and optimization opportunities', () => {
    const sentiment = new SentimentAnalysisAlgorithm();
    const optimization = new ContentOptimizationAlgorithm();

    const sentimentResult = sentiment.analyzeSentiment('great amazing perfect but also sad and worried');
    expect(['positive', 'neutral', 'negative']).toContain(sentimentResult.overallSentiment);
    expect(sentimentResult.confidence).toBeGreaterThanOrEqual(0);

    const analysis: ContentAnalysis = {
      documentId: 'doc-1',
      qualityMetrics: {
        completeness: 55,
        readability: 50,
        uniqueness: 90,
        engagement: 45,
        seoScore: 40
      },
      textStatistics: {
        wordCount: 100,
        sentenceCount: 10,
        paragraphCount: 2,
        averageWordsPerSentence: 10,
        averageSentencesPerParagraph: 5,
        readingTime: 1
      },
      readabilityScores: {
        fleschReadingEase: 60,
        gunningFogIndex: 12,
        colemanLiauIndex: 10,
        automatedReadabilityIndex: 8,
        smogIndex: 7
      },
      contentIssues: [
        {
          type: 'seo',
          severity: 'critical',
          description: 'Missing keyword placement',
          suggestion: 'Add target keyword in opening paragraph'
        }
      ],
      seoAnalysis: {
        titleOptimization: 30,
        keywordDensity: new Map([['catalog', 0.5]]),
        metaDescriptionScore: 20,
        headingStructure: 10,
        internalLinking: 0,
        externalLinking: 0
      },
      sentimentAnalysis: {
        overallSentiment: 'neutral',
        sentimentScore: 0,
        confidence: 0.5
      }
    };

    const suggestions = optimization.generateOptimizationSuggestions(analysis);
    const potential = optimization.calculateImprovementPotential(analysis);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].impact).toBeGreaterThan(0);
    expect(potential.potentialScore).toBeGreaterThanOrEqual(analysis.qualityMetrics.completeness);
    expect(potential.topImprovements.length).toBeGreaterThan(0);
  });

  it('detects duplicate content with risk levels', () => {
    const similarity = new ContentSimilarityAlgorithm();
    const textA = 'catalog products with quality details and optimized description';
    const textB = 'catalog products with quality details and optimized description';
    const textC = 'completely different logistics route optimization document';

    const pair = similarity.calculateSimilarity(textA, textB);
    expect(pair.similarity).toBeGreaterThan(0.8);

    const duplicates = similarity.findDuplicateContent(
      [
        makeDocument('a', textA),
        makeDocument('b', textB),
        makeDocument('c', textC)
      ],
      0.7
    );

    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].riskLevel).toBe('high');
  });
});
