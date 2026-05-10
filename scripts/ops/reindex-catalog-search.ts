import 'dotenv/config';
import { createPrismaClient } from '../../shared/database/prisma-client';
import { externalServicesConfig } from '../../services/catalog-service/src/config/external-services.config';
import {
  SearchConfig,
  SearchHealthMonitor,
  SearchProvider,
  SearchProviderFactory
} from '../../services/catalog-service/src/infrastructure/providers/search.provider';
import { MeilisearchSearchService } from '../../services/catalog-service/src/infrastructure/services/search.service';
import { CatalogSearchIndexer } from '../../services/catalog-service/src/infrastructure/services/catalog-search-indexer.service';

type CliOptions = {
  dryRun: boolean;
  limit?: number;
  batchSize: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    batchSize: 200
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      options.limit = Number(arg.split('=')[1]);
      continue;
    }

    if (arg.startsWith('--batch-size=')) {
      options.batchSize = Number(arg.split('=')[1]);
    }
  }

  if (options.limit !== undefined && (!Number.isFinite(options.limit) || options.limit <= 0)) {
    throw new Error('`--limit` must be a positive number');
  }

  if (!Number.isFinite(options.batchSize) || options.batchSize <= 0) {
    throw new Error('`--batch-size` must be a positive number');
  }

  return options;
}

function getSearchConfig(): SearchConfig {
  const meili = externalServicesConfig.search.meilisearch;

  return {
    provider: externalServicesConfig.search.provider || SearchProvider.MEILISEARCH,
    indexName: meili?.indexName || 'catalog',
    timeout: meili?.requestTimeout || 30000,
    apiKey: meili?.apiKey,
    host: meili?.host,
    port: meili?.port,
    protocol: meili?.protocol,
    fallbackToMemory: false,
    meilisearch: meili ? {
      host: meili.host,
      port: meili.port,
      protocol: meili.protocol,
      apiKey: meili.apiKey,
      indexName: meili.indexName,
      requestTimeout: meili.requestTimeout
    } : undefined
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const prisma = createPrismaClient();
  const searchConfig = getSearchConfig();

  if (searchConfig.provider !== SearchProvider.MEILISEARCH) {
    throw new Error(`Expected SEARCH_PROVIDER=meilisearch but found ${searchConfig.provider}`);
  }

  if (!searchConfig.host) {
    throw new Error('MEILISEARCH_HOST is required');
  }

  const searchProvider = SearchProviderFactory.createDefault(searchConfig);
  const searchService = new MeilisearchSearchService(searchProvider, {
    indexName: searchConfig.indexName || 'catalog'
  });
  const healthMonitor = new SearchHealthMonitor(searchProvider);
  const indexer = new CatalogSearchIndexer(
    prisma,
    searchService,
    searchConfig.indexName || 'catalog',
    searchProvider
  );

  try {
    console.log(`[reindex] provider=${searchConfig.provider} index=${searchConfig.indexName}`);

    if (options.dryRun) {
      const products = await prisma.product.findMany({
        where: {
          status: 'published' as any,
          visibility: 'public' as any
        },
        include: {
          variants: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: options.limit ?? 5
      });

      console.log(`[reindex] dry-run discovered ${products.length} published public products`);
      for (const product of products.slice(0, 5)) {
        console.log(JSON.stringify({
          id: product.id,
          title: product.title,
          status: product.status,
          visibility: product.visibility,
          variantCount: product.variants.length
        }, null, 2));
      }

      const health = await healthMonitor.getHealthStatus();
      console.log('[reindex] current search health');
      console.log(JSON.stringify(health, null, 2));
      return;
    }

    const summary = await indexer.reindexPublishedProducts(options.limit, options.batchSize);
    console.log('[reindex] indexing summary');
    console.log(JSON.stringify(summary, null, 2));

    const health = await healthMonitor.getHealthStatus();
    console.log('[reindex] search health after reindex');
    console.log(JSON.stringify(health, null, 2));
  } finally {
    await searchProvider.close().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  }
}

void main().catch((error) => {
  console.error('[reindex] failed');
  console.error(error);
  process.exit(1);
});
