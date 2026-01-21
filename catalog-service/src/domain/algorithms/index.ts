/**
 * Domain Algorithms Index
 * Central export point for all domain algorithms in the Catalog Service
 * Pure algorithmic implementations - no external dependencies
 */

// Recommendation Algorithms
export * from './recommendation-algorithms';

// Pricing Algorithms
export * from './pricing-algorithms';

// Search Algorithms
export * from './search-algorithms';

// Content Algorithms
export * from './content-algorithms';

/**
 * Algorithm Registry for Runtime Composition
 * Manages algorithm instances and provides unified interface
 */
export class AlgorithmRegistry {
  private static instance: AlgorithmRegistry;
  private algorithms: Map<string, any> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  static getInstance(): AlgorithmRegistry {
    if (!AlgorithmRegistry.instance) {
      AlgorithmRegistry.instance = new AlgorithmRegistry();
    }
    return AlgorithmRegistry.instance;
  }

  registerAlgorithm(category: string, name: string, algorithm: any): void {
    const key = `${category}:${name}`;
    this.algorithms.set(key, algorithm);

    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(name);
  }

  getAlgorithm(category: string, name: string): any | undefined {
    const key = `${category}:${name}`;
    return this.algorithms.get(key);
  }

  getAlgorithmsByCategory(category: string): Map<string, any> {
    const categoryAlgorithms = new Map<string, any>();
    const algorithmNames = this.categories.get(category) || new Set();

    for (const name of algorithmNames) {
      const key = `${category}:${name}`;
      const algorithm = this.algorithms.get(key);
      if (algorithm) {
        categoryAlgorithms.set(name, algorithm);
      }
    }

    return categoryAlgorithms;
  }

  getAllCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  validateAlgorithms(): {
    totalAlgorithms: number;
    validAlgorithms: number;
    invalidAlgorithms: string[];
    categorySummary: Record<string, number>;
  } {
    const invalidAlgorithms: string[] = [];
    const categorySummary: Record<string, number> = {};

    for (const [key, algorithm] of this.algorithms) {
      const [category] = key.split(':');
      categorySummary[category] = (categorySummary[category] || 0) + 1;

      try {
        // Basic validation - check if algorithm has expected methods
        if (typeof algorithm !== 'function' && typeof algorithm !== 'object') {
          invalidAlgorithms.push(key);
        }
      } catch (error) {
        invalidAlgorithms.push(key);
      }
    }

    return {
      totalAlgorithms: this.algorithms.size,
      validAlgorithms: this.algorithms.size - invalidAlgorithms.length,
      invalidAlgorithms,
      categorySummary
    };
  }
}

/**
 * Pre-configured Algorithm Registry
 * Contains default algorithm instances for immediate use
 */
const algorithmRegistry = AlgorithmRegistry.getInstance();

// Algorithm registry is initialized empty for infrastructure binding
// Infrastructure layer will register concrete implementations at runtime
// This maintains domain purity while enabling runtime composition

export const GlobalAlgorithmRegistry = algorithmRegistry;

/**
 * Algorithm Factory Interface - Infrastructure Binding Point
 * Domain defines the contract, infrastructure provides the implementation
 * This ensures domain purity while enabling algorithm instantiation
 */
export interface IAlgorithmFactory {
  createRecommendationEngine(type: 'cosine' | 'pearson' | 'jaccard' | 'hybrid'): any;
  createPricingEngine(type: 'elasticity' | 'dynamic' | 'competitive' | 'margin'): any;
  createSearchEngine(type: 'tfidf' | 'bm25' | 'learning_to_rank'): any;
  createContentEngine(type: 'readability' | 'quality' | 'sentiment' | 'optimization'): any;
}

/**
 * Algorithm Performance Monitor
 * Tracks algorithm execution metrics for optimization
 */
export class AlgorithmPerformanceMonitor {
  private metrics: Map<string, {
    executionCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    successCount: number;
    errorCount: number;
    lastExecutionTime: number;
  }> = new Map();

  recordExecution(algorithmName: string, executionTime: number, success: boolean): void {
    const existing = this.metrics.get(algorithmName) || {
      executionCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      successCount: 0,
      errorCount: 0,
      lastExecutionTime: 0
    };

    existing.executionCount++;
    existing.totalExecutionTime += executionTime;
    existing.averageExecutionTime = existing.totalExecutionTime / existing.executionCount;
    existing.lastExecutionTime = Date.now();

    if (success) {
      existing.successCount++;
    } else {
      existing.errorCount++;
    }

    this.metrics.set(algorithmName, existing);
  }

  getMetrics(algorithmName?: string): any {
    if (algorithmName) {
      return this.metrics.get(algorithmName);
    }

    // Return summary for all algorithms
    const allMetrics = Array.from(this.metrics.entries());
    const summary = {
      totalAlgorithms: allMetrics.length,
      totalExecutions: allMetrics.reduce((sum, [, m]) => sum + m.executionCount, 0),
      averageExecutionTime: allMetrics.length > 0
        ? allMetrics.reduce((sum, [, m]) => sum + m.averageExecutionTime, 0) / allMetrics.length
        : 0,
      successRate: allMetrics.length > 0
        ? allMetrics.reduce((sum, [, m]) => sum + (m.successCount / m.executionCount), 0) / allMetrics.length
        : 0
    };

    return { summary, algorithms: Object.fromEntries(allMetrics) };
  }

  getSlowestAlgorithms(limit: number = 5): Array<{ name: string; avgTime: number; executions: number }> {
    return Array.from(this.metrics.entries())
      .map(([name, metrics]) => ({
        name,
        avgTime: metrics.averageExecutionTime,
        executions: metrics.executionCount
      }))
      .filter(item => item.executions >= 10) // Only include algorithms with sufficient data
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  getMostUsedAlgorithms(limit: number = 5): Array<{ name: string; executions: number; avgTime: number }> {
    return Array.from(this.metrics.entries())
      .map(([name, metrics]) => ({
        name,
        executions: metrics.executionCount,
        avgTime: metrics.averageExecutionTime
      }))
      .sort((a, b) => b.executions - a.executions)
      .slice(0, limit);
  }
}

// Global performance monitor instance
export const GlobalAlgorithmMonitor = new AlgorithmPerformanceMonitor();
