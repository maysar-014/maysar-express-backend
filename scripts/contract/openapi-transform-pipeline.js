const createDefaultNormalizationResult = () => ({
  stats: {
    public: 0,
    protected: 0,
    serviceOrBearer: 0,
    internal: 0,
  },
  exampleStats: {
    generatedExamplesBackfilled: 0,
    generatedExamplesPresent: 0,
  },
  unclassifiedOperations: [],
  appliedTransforms: [],
});

const cloneNormalizationState = (state) => ({
  ...state,
  stats: { ...(state.stats || {}) },
  exampleStats: { ...(state.exampleStats || {}) },
  unclassifiedOperations: Array.isArray(state.unclassifiedOperations) ? [...state.unclassifiedOperations] : [],
  appliedTransforms: Array.isArray(state.appliedTransforms) ? [...state.appliedTransforms] : [],
});

const mergeTransformResult = (state, result) => {
  if (!result || typeof result !== 'object') return state;

  if (result.stats && typeof result.stats === 'object') {
    state.stats = { ...state.stats, ...result.stats };
  }

  if (result.exampleStats && typeof result.exampleStats === 'object') {
    state.exampleStats = { ...state.exampleStats, ...result.exampleStats };
  }

  if (Array.isArray(result.unclassifiedOperations)) {
    state.unclassifiedOperations = [...result.unclassifiedOperations];
  }

  return state;
};

const runTransformPipeline = (doc, transforms, initialState = createDefaultNormalizationResult()) => {
  const state = cloneNormalizationState(initialState);

  for (const transform of transforms || []) {
    if (!transform || typeof transform.name !== 'string' || typeof transform.apply !== 'function') {
      throw new Error('OpenAPI transform pipeline received an invalid transform descriptor.');
    }

    const result = transform.apply(doc, state);
    mergeTransformResult(state, result);
    state.appliedTransforms.push(transform.name);
  }

  return state;
};

module.exports = {
  createDefaultNormalizationResult,
  runTransformPipeline,
};
