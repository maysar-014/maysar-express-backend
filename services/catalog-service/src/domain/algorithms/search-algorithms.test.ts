import {
  BM25Algorithm,
  ContentAuthorityAlgorithm,
  DiversityRankingAlgorithm,
  LearningToRankAlgorithm,
  QueryUnderstandingAlgorithm,
  SearchQuery,
  SearchResult,
  SearchableDocument,
  TFIDFAlgorithm
} from './search-algorithms';

function makeDocument(id: string, title: string, content: string, category: string): SearchableDocument {
  return {
    id,
    title,
    content,
    metadata: new Map<string, unknown>([
      ['category', category],
      ['popularity', 5],
      ['createdAt', new Date('2026-01-01T00:00:00.000Z')]
    ])
  };
}

describe('search-algorithms', () => {
  it('builds TF-IDF and ranks documents by query relevance', () => {
    const algorithm = new TFIDFAlgorithm();
    const docs = [
      makeDocument('d1', 'fast delivery options', 'delivery speed and tracking', 'shipping'),
      makeDocument('d2', 'catalog quality control', 'content quality and seo optimization', 'catalog')
    ];

    algorithm.buildOffline(docs);
    const corpus = docs.map(d => [...d.title.split(/\s+/), ...d.content.split(/\s+/)]);
    const ranked = algorithm.rankDocumentsByRelevance(['delivery'], docs, corpus);

    expect(ranked.length).toBe(1);
    expect(ranked[0].documentId).toBe('d1');
    expect(ranked[0].relevanceScore).toBeGreaterThan(0);
  });

  it('ranks with BM25 and PageRank authority', () => {
    const docs = [
      makeDocument('a', 'buy shoes', 'best shoes for running', 'fashion'),
      makeDocument('b', 'shoe guide', 'buying guide for shoes', 'fashion'),
      makeDocument('c', 'kitchen blender', 'appliance buying tips', 'home')
    ];

    const bm25 = new BM25Algorithm();
    const query = ['buy', 'shoes'];
    const frequency = new Map<string, number>([
      ['buy', 1],
      ['shoes', 1]
    ]);
    const bm25Results = bm25.rankDocuments(query, docs, frequency);

    expect(bm25Results.length).toBeGreaterThan(0);
    expect(bm25Results[0].relevanceScore).toBeGreaterThan(0);

    const authority = new ContentAuthorityAlgorithm();
    const links = new Map<string, string[]>([
      ['a', ['b']],
      ['b', ['a']],
      ['c', ['a']]
    ]);
    const scores = authority.calculatePageRank(docs, links, 0.85, 8);
    expect(scores.size).toBe(3);
    expect((scores.get('a') || 0) + (scores.get('b') || 0) + (scores.get('c') || 0)).toBeGreaterThan(0.9);
  });

  it('combines ranking signals with learning-to-rank', () => {
    const query: SearchQuery = {
      text: 'catalog quality',
      filters: new Map(),
      userContext: {
        userId: 'u1',
        preferences: new Map([['catalog', 2]]),
        searchHistory: ['quality']
      }
    };
    const docs = [
      makeDocument('x', 'catalog quality handbook', 'quality assurance and standards', 'catalog'),
      makeDocument('y', 'shipping updates', 'delivery updates and tracking', 'logistics')
    ];

    const algorithm = new LearningToRankAlgorithm(
      new Map<string, number>([
        ['text_relevance', 1.5],
        ['user_preference', 1.0],
        ['recency', 0.5],
        ['popularity', 0.2],
        ['semantic_similarity', 2.0]
      ])
    );

    const results = algorithm.rankDocuments(
      docs,
      query,
      new Map([
        ['x', new Map([['semantic_similarity', 0.9]])],
        ['y', new Map([['semantic_similarity', 0.1]])]
      ])
    );

    expect(results.length).toBe(2);
    expect(results[0].documentId).toBe('x');
    expect(results[0].relevanceScore).toBeGreaterThan(results[1].relevanceScore);
  });

  it('expands query intent and reranks for diversity', () => {
    const queryUnderstanding = new QueryUnderstandingAlgorithm();
    const expanded = queryUnderstanding.expandQuery(
      'buy phone',
      new Map([['buy', ['purchase']]]),
      new Map([['phone', ['mobile']]])
    );
    const intent = queryUnderstanding.identifyQueryIntent('buy phone at best price');
    expect(expanded).toEqual(expect.arrayContaining(['buy', 'purchase', 'mobile']));
    expect(intent.intent).toBe('transactional');

    const docs = [
      makeDocument('r1', 'phone one', 'details', 'electronics'),
      makeDocument('r2', 'phone two', 'details', 'electronics'),
      makeDocument('r3', 'book one', 'details', 'books')
    ];

    const results: SearchResult[] = [
      {
        documentId: 'r1',
        relevanceScore: 10,
        matchDetails: { titleMatches: [], contentMatches: [], exactPhrases: [], fuzzyMatches: [] },
        rankingFactors: { textRelevance: 1, recency: 1, popularity: 1, userPreference: 1, semanticSimilarity: 1 }
      },
      {
        documentId: 'r2',
        relevanceScore: 9,
        matchDetails: { titleMatches: [], contentMatches: [], exactPhrases: [], fuzzyMatches: [] },
        rankingFactors: { textRelevance: 1, recency: 1, popularity: 1, userPreference: 1, semanticSimilarity: 1 }
      },
      {
        documentId: 'r3',
        relevanceScore: 8,
        matchDetails: { titleMatches: [], contentMatches: [], exactPhrases: [], fuzzyMatches: [] },
        rankingFactors: { textRelevance: 1, recency: 1, popularity: 1, userPreference: 1, semanticSimilarity: 1 }
      }
    ];

    const diversity = new DiversityRankingAlgorithm();
    const reranked = diversity.rerankForDiversity(results, docs, 0.5);
    const score = diversity.calculateDiversityScore(reranked, docs);

    expect(reranked).toHaveLength(3);
    expect(score).toBeGreaterThan(0);
  });
});
