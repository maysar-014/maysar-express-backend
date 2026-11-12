// @ts-nocheck
/**
 * Product Identifier Resolution — Property-Based Tests
 *
 * Verifies the transparent resolution invariant for GetProductUseCase:
 * a product is equally reachable by its system ID and its URL slug,
 * the slug fallback fires only when findById returns null, and
 * unknown identifiers always yield not_found.
 *
 * No database required — uses an in-memory mock repository.
 *
 * Feature: product-identifier-resolution
 */

import { GetProductUseCase } from '../get-product.use-case';
import { ProductRepository, MediaRepository, DomainRecord } from '../../../domain/interfaces';

// ---------------------------------------------------------------------------
// Helpers — forAll
// ---------------------------------------------------------------------------

/** Run a property test N times with a generator */
function forAll<T>(
  count: number,
  generator: () => T,
  property: (value: T) => void | Promise<void>
): Promise<void> {
  return (async () => {
    for (let i = 0; i < count; i++) {
      await property(generator());
    }
  })();
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Random product generator
// ---------------------------------------------------------------------------

type SeedableProduct = DomainRecord & { id: string; slug: string };

function randomProduct(): SeedableProduct {
  const suffix = randomSuffix();
  return {
    id: `prod_${suffix}`,
    slug: `product-slug-${suffix}`,
    sellerId: `seller_${suffix}`,
    name: `Product ${suffix}`,
    description: `Description for product ${suffix}`,
    price: { amount: randomInt(100, 100_000), currency: 'TZS' },
    categoryId: `cat_${suffix}`,
    type: 'physical',
    tags: [],
    attributes: {},
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: [],
  };
}

// ---------------------------------------------------------------------------
// In-memory mock repository
// ---------------------------------------------------------------------------

class InMemoryProductRepository implements ProductRepository {
  private readonly byId = new Map<string, DomainRecord>();
  private readonly bySlug = new Map<string, DomainRecord>();

  public findBySlugCallCount = 0;

  seed(product: SeedableProduct): void {
    this.byId.set(product.id, product);
    this.bySlug.set(product.slug, product);
  }

  reset(): void {
    this.byId.clear();
    this.bySlug.clear();
    this.findBySlugCallCount = 0;
  }

  resetCallCount(): void {
    this.findBySlugCallCount = 0;
  }

  async findById(id: string): Promise<DomainRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<DomainRecord | null> {
    this.findBySlugCallCount++;
    return this.bySlug.get(slug) ?? null;
  }

  // Unused stubs — required by interface
  async save(p: DomainRecord): Promise<DomainRecord> { return p; }
  async findBySeller(): Promise<DomainRecord[]> { return []; }
  async findByCategory(): Promise<DomainRecord[]> { return []; }
  async search(): Promise<DomainRecord> { return {} as DomainRecord; }
  async updateStatus(id: string): Promise<DomainRecord> { return { id } as DomainRecord; }
  async delete(): Promise<boolean> { return true; }
}

// ---------------------------------------------------------------------------
// Minimal MediaRepository stub
// ---------------------------------------------------------------------------

const stubMediaRepository: MediaRepository = {
  save: async (m) => m,
  findById: async () => null,
  findByProduct: async () => [],
  delete: async () => true,
  updateMetadata: async (id) => ({ id } as DomainRecord),
};

// ---------------------------------------------------------------------------
// Property 1: ID–Slug Round-Trip Consistency
// Feature: product-identifier-resolution, Property 1: ID–Slug Round-Trip Consistency
// Validates: Requirements 2.1, 2.3, 5.1, 5.2, 5.3, 4.5
// ---------------------------------------------------------------------------

describe('Property 1: ID–Slug Round-Trip Consistency', () => {
  it(
    'should return the same product regardless of whether the system ID or slug is supplied',
    async () => {
      await forAll(
        100,
        () => {
          const count = randomInt(1, 20);
          return Array.from({ length: count }, () => randomProduct());
        },
        async (products) => {
          const repo = new InMemoryProductRepository();
          products.forEach(p => repo.seed(p));

          const useCase = new GetProductUseCase(repo, stubMediaRepository);
          const target = products[randomInt(0, products.length - 1)];

          // --- Fetch by system ID ---
          const byId = await useCase.execute({ productId: target.id });
          expect(byId.status).toBe('success');
          expect((byId.product as any)?.id).toBe(target.id);

          // --- Fetch by slug (findById returns null for the slug string) ---
          const bySlug = await useCase.execute({ productId: target.slug });
          expect(bySlug.status).toBe('success');
          expect((bySlug.product as any)?.id).toBe(target.id);
        }
      );
    },
    30_000
  );
});

// ---------------------------------------------------------------------------
// Property 2: Fallback Invoked Iff findById Returns Null
// Feature: product-identifier-resolution, Property 2: Fallback Invoked Iff findById Returns Null
// Validates: Requirements 2.2, 5.4
// ---------------------------------------------------------------------------

describe('Property 2: Fallback Invoked Iff findById Returns Null', () => {
  it(
    'should NOT call findBySlug when findById succeeds',
    async () => {
      await forAll(
        100,
        () => randomProduct(),
        async (product) => {
          const repo = new InMemoryProductRepository();
          repo.seed(product);
          const useCase = new GetProductUseCase(repo, stubMediaRepository);

          repo.resetCallCount();
          await useCase.execute({ productId: product.id });

          expect(repo.findBySlugCallCount).toBe(0);
        }
      );
    },
    30_000
  );

  it(
    'should call findBySlug EXACTLY ONCE when findById returns null',
    async () => {
      await forAll(
        100,
        () => randomProduct(),
        async (product) => {
          const repo = new InMemoryProductRepository();
          repo.seed(product);
          const useCase = new GetProductUseCase(repo, stubMediaRepository);

          repo.resetCallCount();
          // Supply the slug — findById will return null for it,
          // so the fallback must fire exactly once
          await useCase.execute({ productId: product.slug });

          expect(repo.findBySlugCallCount).toBe(1);
        }
      );
    },
    30_000
  );
});

// ---------------------------------------------------------------------------
// Property 3: Unknown Identifiers Always Yield not_found
// Feature: product-identifier-resolution, Property 3: Unknown Identifiers Always Yield not_found
// Validates: Requirements 2.4, 4.3
// ---------------------------------------------------------------------------

describe('Property 3: Unknown Identifiers Always Yield not_found', () => {
  it(
    'should return not_found for any identifier that matches neither an ID nor a slug',
    async () => {
      await forAll(
        100,
        () => {
          // An identifier that is deliberately never seeded
          return `unknown-${randomSuffix()}-${randomSuffix()}`;
        },
        async (unknownId) => {
          const repo = new InMemoryProductRepository();
          // Seed some products so the repo is non-empty, but none match unknownId
          Array.from({ length: randomInt(0, 5) }, () => randomProduct()).forEach(p => repo.seed(p));

          const useCase = new GetProductUseCase(repo, stubMediaRepository);
          const result = await useCase.execute({ productId: unknownId });

          expect(result.status).toBe('not_found');
        }
      );
    },
    30_000
  );
});
