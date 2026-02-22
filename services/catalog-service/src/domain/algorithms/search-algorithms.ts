/**
 * Search Algorithms
 * Pure algorithmic implementations for search ranking and relevance
 * No external dependencies - pure mathematical computations
 */

export interface SearchQuery {
  text: string;
  filters: Map<string, any>;
  userContext?: {
    userId: string;
    preferences: Map<string, number>;
    searchHistory: string[];
  };
}

export interface SearchableDocument {
  id: string;
  title: string;
  content: string;
  metadata: Map<string, any>;
  relevanceScore?: number;
}

export interface SearchResult {
  documentId: string;
  relevanceScore: number;
  matchDetails: {
    titleMatches: string[];
    contentMatches: string[];
    exactPhrases: string[];
    fuzzyMatches: string[];
  };
  rankingFactors: {
    textRelevance: number;
    recency: number;
    popularity: number;
    userPreference: number;
    semanticSimilarity: number;
  };
}

/**
 * TF-IDF (Term Frequency-Inverse Document Frequency) Algorithm
 * Calculates term importance within documents and across corpus
 */
export class TFIDFAlgorithm {
  private precomputedIDF: Map<string, number> = new Map();
  private storedTF: Map<string, Map<string, number>> = new Map();

  buildOffline(documents: SearchableDocument[]): void {
    const termDocFreq = new Map<string, number>();
    const totalDocs = documents.length;

    for (const doc of documents) {
      const words = [...doc.title.split(/\s+/), ...doc.content.split(/\s+/)];
      const termFreq = new Map<string, number>();
      const uniqueTerms = new Set<string>();

      for (const word of words) {
        const term = word.toLowerCase();
        if (term.length > 2) {
          termFreq.set(term, (termFreq.get(term) || 0) + 1);
          uniqueTerms.add(term);
        }
      }

      this.storedTF.set(doc.id, termFreq);

      for (const term of uniqueTerms) {
        termDocFreq.set(term, (termDocFreq.get(term) || 0) + 1);
      }
    }

    for (const [term, df] of termDocFreq) {
      this.precomputedIDF.set(term, Math.log((totalDocs + 1) / (df + 1)));
    }
  }

  calculateTFIDF(
    term: string,
    document: string[],
    corpus: string[][]
  ): number {
    const tf = document.filter(word => word.toLowerCase() === term.toLowerCase()).length / document.length;
    let documentsWithTerm = 0;
    for (const doc of corpus) {
      if (doc.some(word => word.toLowerCase() === term.toLowerCase())) {
        documentsWithTerm++;
      }
    }
    const idf = Math.log(corpus.length / (1 + documentsWithTerm));
    return tf * idf;
  }

  buildTFIDFVector(
    document: string[],
    corpus: string[][],
    vocabulary: Set<string>
  ): Map<string, number> {
    const vector = new Map<string, number>();
    for (const term of vocabulary) {
      const score = this.calculateTFIDF(term, document, corpus);
      if (score > 0) {
        vector.set(term, score);
      }
    }
    return vector;
  }

  rankDocumentsByRelevance(
    query: string[],
    documents: SearchableDocument[],
    corpus: string[][]
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const queryTerms = query.map(t => t.toLowerCase());

    for (const document of documents) {
      const docTF = this.storedTF.get(document.id);
      if (!docTF) continue;

      let score = 0;
      for (const term of queryTerms) {
        const tf = docTF.get(term) || 0;
        const idf = this.precomputedIDF.get(term) || 0;
        score += tf * idf;
      }

      if (score > 0) {
        results.push({
          documentId: document.id,
          relevanceScore: score,
          matchDetails: {
            titleMatches: [],
            contentMatches: [],
            exactPhrases: [],
            fuzzyMatches: []
          },
          rankingFactors: {
            textRelevance: score,
            recency: 0,
            popularity: 0,
            userPreference: 0,
            semanticSimilarity: 0
          }
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private cosineSimilarity(vectorA: Map<string, number>, vectorB: Map<string, number>): number {
    const commonTerms = new Set([...vectorA.keys(), ...vectorB.keys()]);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const term of commonTerms) {
      const valA = vectorA.get(term) || 0;
      const valB = vectorB.get(term) || 0;

      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * BM25 (Best Matching 25) Algorithm
 * Probabilistic ranking function for information retrieval
 */
export class BM25Algorithm {
  constructor(
    private k1: number = 1.5,  // Term frequency scaling factor
    private b: number = 0.75   // Length normalization factor
  ) {}

  scoreDocument(
    queryTerms: string[],
    document: string[],
    averageDocumentLength: number,
    totalDocuments: number,
    documentFrequency: Map<string, number>
  ): number {
    let score = 0;

    for (const term of queryTerms) {
      const termFreq = document.filter(word => word.toLowerCase() === term.toLowerCase()).length;
      const docFreq = documentFrequency.get(term.toLowerCase()) || 1;

      if (termFreq === 0) continue;

      // IDF (Inverse Document Frequency)
      const idf = Math.log((totalDocuments - docFreq + 0.5) / (docFreq + 0.5));

      // Term frequency component with length normalization
      const tfComponent = (termFreq * (this.k1 + 1)) /
                         (termFreq + this.k1 * (1 - this.b + this.b * (document.length / averageDocumentLength)));

      score += idf * tfComponent;
    }

    return score;
  }

  rankDocuments(
    query: string[],
    documents: SearchableDocument[],
    documentFrequency: Map<string, number>
  ): SearchResult[] {
    const totalDocuments = documents.length;
    const totalLength = documents.reduce((sum, doc) =>
      sum + doc.title.split(/\s+/).length + doc.content.split(/\s+/).length, 0
    );
    const averageDocumentLength = totalLength / totalDocuments;

    const results: SearchResult[] = [];

    for (const document of documents) {
      const docWords = [...document.title.split(/\s+/), ...document.content.split(/\s+/)];
      const score = this.scoreDocument(query, docWords, averageDocumentLength, totalDocuments, documentFrequency);

      if (score > 0) {
        results.push({
          documentId: document.id,
          relevanceScore: score,
          matchDetails: {
            titleMatches: [],
            contentMatches: [],
            exactPhrases: [],
            fuzzyMatches: []
          },
          rankingFactors: {
            textRelevance: score,
            recency: 0,
            popularity: 0,
            userPreference: 0,
            semanticSimilarity: 0
          }
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

/**
 * PageRank-style Algorithm for Content Authority
 * Ranks documents based on citation and reference patterns
 */
export class ContentAuthorityAlgorithm {
  calculatePageRank(
    documents: SearchableDocument[],
    links: Map<string, string[]>, // documentId -> referenced documentIds
    dampingFactor: number = 0.85,
    iterations: number = 20
  ): Map<string, number> {
    const documentIds = documents.map(doc => doc.id);
    const numDocuments = documentIds.length;

    // Initialize PageRank values
    let pageRanks = new Map<string, number>();
    for (const id of documentIds) {
      pageRanks.set(id, 1 / numDocuments);
    }

    for (let iteration = 0; iteration < iterations; iteration++) {
      const newPageRanks = new Map<string, number>();

      for (const documentId of documentIds) {
        let rankSum = 0;

        // Find documents that link to this one (simplified - reverse links)
        for (const [sourceId, targets] of links) {
          if (targets.includes(documentId)) {
            const sourceRank = pageRanks.get(sourceId) || 0;
            const sourceOutlinks = targets.length;
            rankSum += sourceRank / sourceOutlinks;
          }
        }

        const newRank = (1 - dampingFactor) / numDocuments + dampingFactor * rankSum;
        newPageRanks.set(documentId, newRank);
      }

      pageRanks = newPageRanks;
    }

    return pageRanks;
  }
}

/**
 * Learning to Rank Algorithm
 * Combines multiple ranking signals using learned weights
 */
export class LearningToRankAlgorithm {
  constructor(private featureWeights: Map<string, number>) {}

  scoreDocument(
    document: SearchableDocument,
    query: SearchQuery,
    additionalFeatures: Map<string, number>
  ): number {
    let score = 0;

    // Text relevance features
    const textRelevance = this.calculateTextRelevance(document, query);
    score += (this.featureWeights.get('text_relevance') || 1) * textRelevance;

    // User preference features
    if (query.userContext) {
      const userPreference = this.calculateUserPreference(document, query.userContext);
      score += (this.featureWeights.get('user_preference') || 1) * userPreference;
    }

    // Recency features
    const recency = this.calculateRecencyScore(document);
    score += (this.featureWeights.get('recency') || 1) * recency;

    // Popularity features
    const popularity = document.metadata.get('popularity') as number || 0;
    score += (this.featureWeights.get('popularity') || 1) * popularity;

    // Additional features
    for (const [feature, value] of additionalFeatures) {
      const weight = this.featureWeights.get(feature) || 0;
      score += weight * value;
    }

    return score;
  }

  rankDocuments(
    documents: SearchableDocument[],
    query: SearchQuery,
    additionalFeatures: Map<string, Map<string, number>> = new Map()
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const document of documents) {
      const docFeatures = additionalFeatures.get(document.id) || new Map();
      const relevanceScore = this.scoreDocument(document, query, docFeatures);

      results.push({
        documentId: document.id,
        relevanceScore,
        matchDetails: {
          titleMatches: [],
          contentMatches: [],
          exactPhrases: [],
          fuzzyMatches: []
        },
        rankingFactors: {
          textRelevance: this.calculateTextRelevance(document, query),
          recency: this.calculateRecencyScore(document),
          popularity: document.metadata.get('popularity') as number || 0,
          userPreference: query.userContext ? this.calculateUserPreference(document, query.userContext) : 0,
          semanticSimilarity: docFeatures.get('semantic_similarity') || 0
        }
      });
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateTextRelevance(document: SearchableDocument, query: SearchQuery): number {
    const queryTerms = query.text.toLowerCase().split(/\s+/);
    const title = document.title.toLowerCase();
    const content = document.content.toLowerCase();

    let score = 0;

    for (const term of queryTerms) {
      // Exact matches in title
      if (title.includes(term)) {
        score += 10;
      }
      // Exact matches in content
      else if (content.includes(term)) {
        score += 5;
      }
      // Partial matches
      else {
        const titleWords = title.split(/\s+/);
        const contentWords = content.split(/\s+/);

        const titleMatches = titleWords.filter(word => word.includes(term)).length;
        const contentMatches = contentWords.filter(word => word.includes(term)).length;

        score += titleMatches * 2 + contentMatches;
      }
    }

    return score;
  }

  private calculateUserPreference(document: SearchableDocument, userContext: any): number {
    let preference = 0;

    // Category preferences
    const category = document.metadata.get('category') as string;
    if (category && userContext.preferences.has(category)) {
      preference += userContext.preferences.get(category) * 5;
    }

    // Search history relevance
    for (const searchTerm of userContext.searchHistory) {
      if (document.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          document.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        preference += 2;
      }
    }

    return preference;
  }

  private calculateRecencyScore(document: SearchableDocument): number {
    const createdAt = document.metadata.get('createdAt') as Date;
    if (!createdAt) return 0;

    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: newer documents get higher scores
    return Math.exp(-ageInDays / 365); // Half-life of 1 year
  }
}

/**
 * Query Understanding Algorithm
 * Analyzes and expands search queries for better results
 */
export class QueryUnderstandingAlgorithm {
  expandQuery(
    originalQuery: string,
    synonymMap: Map<string, string[]>,
    relatedTerms: Map<string, string[]>
  ): string[] {
    const terms = originalQuery.toLowerCase().split(/\s+/);
    const expandedTerms = new Set<string>(terms);

    for (const term of terms) {
      // Add synonyms
      const synonyms = synonymMap.get(term) || [];
      synonyms.forEach(synonym => expandedTerms.add(synonym));

      // Add related terms
      const related = relatedTerms.get(term) || [];
      related.forEach(rel => expandedTerms.add(rel));
    }

    return Array.from(expandedTerms);
  }

  identifyQueryIntent(query: string): {
    intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
    confidence: number;
    entities: string[];
  } {
    const lowerQuery = query.toLowerCase();

    // Simple intent classification
    if (lowerQuery.includes('buy') || lowerQuery.includes('purchase') || lowerQuery.includes('price')) {
      return {
        intent: 'transactional',
        confidence: 0.8,
        entities: this.extractEntities(query, ['price', 'buy', 'purchase', 'order'])
      };
    }

    if (lowerQuery.includes('how') || lowerQuery.includes('what') || lowerQuery.includes('why')) {
      return {
        intent: 'informational',
        confidence: 0.7,
        entities: this.extractEntities(query, ['how', 'what', 'why', 'when', 'where'])
      };
    }

    if (lowerQuery.includes('website') || lowerQuery.includes('site') || lowerQuery.includes('page')) {
      return {
        intent: 'navigational',
        confidence: 0.6,
        entities: this.extractEntities(query, ['website', 'site', 'page', 'login', 'contact'])
      };
    }

    return {
      intent: 'commercial',
      confidence: 0.5,
      entities: []
    };
  }

  private extractEntities(query: string, keywords: string[]): string[] {
    const words = query.toLowerCase().split(/\s+/);
    return words.filter(word => keywords.some(keyword => word.includes(keyword)));
  }
}

/**
 * Diversity Ranking Algorithm
 * Ensures search results include diverse content categories
 */
export class DiversityRankingAlgorithm {
  rerankForDiversity(
    results: SearchResult[],
    documents: SearchableDocument[],
    diversityFactor: number = 0.3
  ): SearchResult[] {
    if (results.length === 0) return results;

    const documentMap = new Map(documents.map(doc => [doc.id, doc]));
    const categoryCounts = new Map<string, number>();
    const rerankedResults: SearchResult[] = [];

    for (const result of results) {
      const document = documentMap.get(result.documentId);
      if (!document) continue;

      const category = document.metadata.get('category') as string || 'uncategorized';
      const categoryCount = categoryCounts.get(category) || 0;

      // Apply diversity penalty for over-represented categories
      const diversityPenalty = Math.min(categoryCount * diversityFactor, result.relevanceScore * 0.5);
      const adjustedScore = result.relevanceScore - diversityPenalty;

      rerankedResults.push({
        ...result,
        relevanceScore: Math.max(adjustedScore, 0.1) // Minimum score to avoid zero
      });

      categoryCounts.set(category, categoryCount + 1);
    }

    return rerankedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  calculateDiversityScore(results: SearchResult[], documents: SearchableDocument[]): number {
    if (results.length === 0) return 0;

    const documentMap = new Map(documents.map(doc => [doc.id, doc]));
    const categories = new Set<string>();

    for (const result of results) {
      const document = documentMap.get(result.documentId);
      if (document) {
        const category = document.metadata.get('category') as string || 'uncategorized';
        categories.add(category);
      }
    }

    // Diversity score based on unique categories vs total results
    return categories.size / Math.min(results.length, 10); // Cap at 10 for normalization
  }
}
