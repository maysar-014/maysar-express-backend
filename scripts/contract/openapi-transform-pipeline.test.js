const {
  createDefaultNormalizationResult,
  runTransformPipeline,
} = require('./openapi-transform-pipeline');

describe('openapi transform pipeline', () => {
  it('tracks applied transforms and merges transform results into a stable state object', () => {
    const doc = { touched: [] };

    const result = runTransformPipeline(doc, [
      {
        name: 'first-pass',
        apply(currentDoc) {
          currentDoc.touched.push('first-pass');
        },
      },
      {
        name: 'second-pass',
        apply(currentDoc) {
          currentDoc.touched.push('second-pass');
          return {
            stats: { public: 3, protected: 2 },
            exampleStats: { generatedExamplesBackfilled: 4, generatedExamplesPresent: 7 },
            unclassifiedOperations: ['GET /api/example'],
          };
        },
      },
    ]);

    expect(doc.touched).toEqual(['first-pass', 'second-pass']);
    expect(result.appliedTransforms).toEqual(['first-pass', 'second-pass']);
    expect(result.stats).toEqual({
      public: 3,
      protected: 2,
      serviceOrBearer: 0,
      internal: 0,
    });
    expect(result.exampleStats).toEqual({
      generatedExamplesBackfilled: 4,
      generatedExamplesPresent: 7,
    });
    expect(result.unclassifiedOperations).toEqual(['GET /api/example']);
  });

  it('does not mutate the default normalization template', () => {
    const defaults = createDefaultNormalizationResult();
    const result = runTransformPipeline({}, []);

    expect(result).toEqual(defaults);
    expect(result).not.toBe(defaults);
    expect(result.stats).not.toBe(defaults.stats);
    expect(result.exampleStats).not.toBe(defaults.exampleStats);
    expect(result.unclassifiedOperations).not.toBe(defaults.unclassifiedOperations);
    expect(result.appliedTransforms).not.toBe(defaults.appliedTransforms);
  });
});
