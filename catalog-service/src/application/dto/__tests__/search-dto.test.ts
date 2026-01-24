/**
 * Search DTO Tests
 * Tests for search data transfer objects and their validation logic
 */

import {
  ProductSearchRequestDto,
  ProductSearchResponseDto,
  SearchTemplateDto,
  isProductSearchRequestDto,
  isProductSearchResponseDto,
  isSearchTemplateDto,
  createProductSearchRequest,
  createSearchTemplate,
  SearchStrategy,
  SortDirection
} from '../search-dto';

describe('ProductSearchRequestDto', () => {
  describe('Type Guards', () => {
    describe('isProductSearchRequestDto', () => {
      it('should return true for valid ProductSearchRequestDto', () => {
        const validDto: ProductSearchRequestDto = {
          query: 'laptop',
          filters: {
            category: 'electronics',
            priceRange: { min: 100, max: 1000 }
          },
          sorting: {
            field: 'price',
            direction: 'asc' as SortDirection
          },
          pagination: {
            page: 1,
            limit: 20
          },
          searchOptions: {
            strategy: 'hybrid' as SearchStrategy,
            includeFacets: true
          }
        };

        expect(isProductSearchRequestDto(validDto)).toBe(true);
      });

      it('should return true for minimal valid ProductSearchRequestDto', () => {
        const minimalDto: ProductSearchRequestDto = {
          filters: {},
          sorting: {
            field: 'relevance',
            direction: 'desc' as SortDirection
          },
          pagination: {
            page: 1,
            limit: 10
          },
          searchOptions: {}
        };

        expect(isProductSearchRequestDto(minimalDto)).toBe(true);
      });

      it('should return false for invalid data', () => {
        expect(isProductSearchRequestDto(null)).toBe(false);
        expect(isProductSearchRequestDto({})).toBe(false);
        expect(isProductSearchRequestDto({ filters: {} })).toBe(false);
      });

      it('should validate sorting field values', () => {
        const baseDto = {
          filters: {},
          sorting: {
            field: 'relevance' as any,
            direction: 'desc' as SortDirection
          },
          pagination: {
            page: 1,
            limit: 10
          },
          searchOptions: {}
        };

        const validFields = ['relevance', 'price', 'rating', 'newest', 'popularity', 'distance', 'name'];

        validFields.forEach(field => {
          expect(isProductSearchRequestDto({
            ...baseDto,
            sorting: { ...baseDto.sorting, field }
          })).toBe(true);
        });

        expect(isProductSearchRequestDto({
          ...baseDto,
          sorting: { ...baseDto.sorting, field: 'invalid_field' }
        })).toBe(false);
      });

      it('should validate sorting direction values', () => {
        const baseDto = {
          filters: {},
          sorting: {
            field: 'relevance',
            direction: 'asc' as SortDirection
          },
          pagination: {
            page: 1,
            limit: 10
          },
          searchOptions: {}
        };

        expect(isProductSearchRequestDto({
          ...baseDto,
          sorting: { ...baseDto.sorting, direction: 'asc' }
        })).toBe(true);

        expect(isProductSearchRequestDto({
          ...baseDto,
          sorting: { ...baseDto.sorting, direction: 'desc' }
        })).toBe(true);

        expect(isProductSearchRequestDto({
          ...baseDto,
          sorting: { ...baseDto.sorting, direction: 'invalid' as any }
        })).toBe(false);
      });

      it('should validate pagination values', () => {
        const baseDto = {
          filters: {},
          sorting: {
            field: 'relevance',
            direction: 'desc' as SortDirection
          },
          pagination: {
            page: 1,
            limit: 10
          },
          searchOptions: {}
        };

        // Valid pagination
        expect(isProductSearchRequestDto(baseDto)).toBe(true);

        // Invalid page
        expect(isProductSearchRequestDto({
          ...baseDto,
          pagination: { page: 0, limit: 10 }
        })).toBe(false);

        expect(isProductSearchRequestDto({
          ...baseDto,
          pagination: { page: -1, limit: 10 }
        })).toBe(false);

        // Invalid limit
        expect(isProductSearchRequestDto({
          ...baseDto,
          pagination: { page: 1, limit: 0 }
        })).toBe(false);

        expect(isProductSearchRequestDto({
          ...baseDto,
          pagination: { page: 1, limit: -5 }
        })).toBe(false);
      });

      it('should handle optional query field', () => {
        const dtoWithoutQuery: ProductSearchRequestDto = {
          filters: {},
          sorting: {
            field: 'relevance',
            direction: 'desc' as SortDirection
          },
          pagination: {
            page: 1,
            limit: 10
          },
          searchOptions: {}
        };

        const dtoWithQuery: ProductSearchRequestDto = {
          query: 'test search',
          filters: {},
          sorting: {
            field: 'relevance',
            direction: 'desc' as SortDirection
          },
          pagination: {
            page: 1,
            limit: 10
          },
          searchOptions: {}
        };

        expect(isProductSearchRequestDto(dtoWithoutQuery)).toBe(true);
        expect(isProductSearchRequestDto(dtoWithQuery)).toBe(true);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createProductSearchRequest', () => {
      it('should create a valid ProductSearchRequestDto from valid data', () => {
        const input = {
          query: 'wireless headphones',
          filters: {
            category: 'electronics',
            priceRange: { min: 50, max: 200 },
            inStock: true
          },
          sorting: {
            field: 'rating',
            direction: 'desc' as SortDirection
          },
          pagination: {
            page: 2,
            limit: 25
          },
          searchOptions: {
            strategy: 'semantic' as SearchStrategy,
            includeFacets: true,
            includeSuggestions: true
          },
          context: {
            userId: 'user123',
            searchHistory: ['laptop', 'phone']
          }
        };

        const result = createProductSearchRequest(input);

        expect(result.query).toBe('wireless headphones');
        expect(result.filters.category).toBe('electronics');
        expect(result.filters.priceRange).toEqual({ min: 50, max: 200 });
        expect(result.sorting.field).toBe('rating');
        expect(result.sorting.direction).toBe('desc');
        expect(result.pagination.page).toBe(2);
        expect(result.pagination.limit).toBe(25);
        expect(result.searchOptions.strategy).toBe('semantic');
        expect(result.context?.userId).toBe('user123');
      });

      it('should throw error for invalid data', () => {
        const invalidInput = {
          query: 'test',
          // Missing required fields
        };

        expect(() => createProductSearchRequest(invalidInput)).toThrow('Invalid ProductSearchRequestDto data');
      });

      it('should handle complex filter objects', () => {
        const input = {
          filters: {
            categories: ['electronics', 'audio'],
            tags: ['wireless', 'bluetooth'],
            rating: { min: 4.0 },
            attributes: { color: 'black', connectivity: 'bluetooth' },
            location: {
              latitude: -1.2864,
              longitude: 36.8172,
              radius: 50
            }
          },
          sorting: {
            field: 'distance',
            direction: 'asc' as SortDirection
          },
          pagination: {
            page: 1,
            limit: 20
          },
          searchOptions: {
            scope: 'products' as any,
            fuzzyThreshold: 0.8
          }
        };

        const result = createProductSearchRequest(input);

        expect(result.filters.categories).toEqual(['electronics', 'audio']);
        expect(result.filters.tags).toEqual(['wireless', 'bluetooth']);
        expect(result.filters.rating).toEqual({ min: 4.0 });
        expect(result.filters.attributes).toEqual({ color: 'black', connectivity: 'bluetooth' });
        expect(result.filters.location?.latitude).toBe(-1.2864);
        expect(result.sorting.field).toBe('distance');
      });
    });
  });

  describe('ProductSearchResponseDto', () => {
    describe('Type Guards', () => {
      describe('isProductSearchResponseDto', () => {
        it('should return true for valid ProductSearchResponseDto', () => {
          const validDto: ProductSearchResponseDto = {
            results: [
              {
                productId: 'prod-123',
                name: 'Test Product',
                description: 'A test product description',
                price: { amount: 99.99, currency: 'USD' },
                category: { id: 'cat-1', name: 'Electronics' },
                seller: { id: 'seller-1', name: 'Test Seller' },
                type: 'physical',
                tags: ['test'],
                status: 'active',
                relevanceScore: 0.95,
                matchReasons: ['name_match'],
                highlights: { name: ['Test'] },
                media: [{ url: 'test.jpg', type: 'image', altText: 'Test image', isPrimary: true }],
                inventory: { available: 10, status: 'in_stock' },
                rating: { average: 4.5, count: 25 },
                analytics: { viewCount: 100, purchaseCount: 5 },
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ],
            total: 1,
            pagination: {
              page: 1,
              limit: 20,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
              totalResults: 1
            },
            searchMetadata: {
              query: 'test',
              filtersApplied: ['category:electronics', 'priceRange:min-100,max-1000'],
              executionTime: 150,
              searchEngine: 'elasticsearch',
              strategyUsed: 'hybrid' as SearchStrategy,
              totalDocumentsSearched: 10000
            }
          };

          expect(isProductSearchResponseDto(validDto)).toBe(true);
        });

        it('should return false for invalid data', () => {
          expect(isProductSearchResponseDto(null)).toBe(false);
          expect(isProductSearchResponseDto({})).toBe(false);
          expect(isProductSearchResponseDto({ results: [] })).toBe(false);
        });

        it('should validate results array', () => {
          const baseDto = {
            results: [],
            total: 0,
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
              totalResults: 0
            },
            searchMetadata: {
              query: 'test',
              executionTime: 100,
              searchEngine: 'test',
              strategyUsed: 'exact' as SearchStrategy,
              totalDocumentsSearched: 100
            }
          };

          expect(isProductSearchResponseDto(baseDto)).toBe(true);

          // Invalid results type
          expect(isProductSearchResponseDto({
            ...baseDto,
            results: 'invalid' as any
          })).toBe(false);
        });
      });
    });
  });

  describe('SearchTemplateDto', () => {
    describe('Type Guards', () => {
      describe('isSearchTemplateDto', () => {
        it('should return true for valid SearchTemplateDto', () => {
          const validDto: SearchTemplateDto = {
            templateId: 'template-123',
            name: 'Premium Electronics Search',
            description: 'Search template for high-end electronics',
            category: 'business_type',
            baseQuery: {
              filters: {
                priceRange: { min: 500, max: 5000 },
                rating: { min: 4.5 }
              },
              sorting: {
                field: 'rating',
                direction: 'desc' as SortDirection
              },
              pagination: {
                page: 1,
                limit: 20
              },
              searchOptions: {
                strategy: 'semantic' as SearchStrategy
              }
            },
            variables: [
              {
                name: 'category',
                type: 'string',
                required: true
              },
              {
                name: 'minPrice',
                type: 'number',
                required: false,
                defaultValue: 500,
                validation: { min: 0 }
              }
            ],
            isActive: true,
            usageCount: 15,
            createdBy: 'admin',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-15'),
            tags: ['premium', 'electronics']
          };

          expect(isSearchTemplateDto(validDto)).toBe(true);
        });

        it('should return false for invalid data', () => {
          expect(isSearchTemplateDto(null)).toBe(false);
          expect(isSearchTemplateDto({})).toBe(false);
          expect(isSearchTemplateDto({
            templateId: 'template-123',
            name: 'Test Template'
            // Missing required fields
          })).toBe(false);
        });

        it('should validate category values', () => {
          const baseDto = {
            templateId: 'template-123',
            name: 'Test Template',
            category: 'user_segment',
            baseQuery: {
              filters: {},
              sorting: {
                field: 'relevance',
                direction: 'desc' as SortDirection
              },
              pagination: { page: 1, limit: 10 },
              searchOptions: {}
            },
            variables: [],
            isActive: true,
            usageCount: 0,
            createdBy: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const validCategories = ['user_segment', 'business_type', 'seasonal', 'promotional', 'custom'];

          validCategories.forEach(category => {
            expect(isSearchTemplateDto({
              ...baseDto,
              category: category as any
            })).toBe(true);
          });

          expect(isSearchTemplateDto({
            ...baseDto,
            category: 'invalid_category' as any
          })).toBe(false);
        });
      });
    });

    describe('Factory Functions', () => {
      describe('createSearchTemplate', () => {
        it('should create a valid SearchTemplateDto from valid data', () => {
          const input = {
            templateId: 'template-456',
            name: 'Mobile Phones Search',
            description: 'Template for searching mobile phones',
            category: 'business_type',
            baseQuery: {
              filters: {
                categories: ['electronics', 'mobile'],
                inStock: true
              },
              sorting: {
                field: 'price',
                direction: 'asc' as SortDirection
              },
              pagination: {
                page: 1,
                limit: 50
              },
              searchOptions: {
                includeFacets: true,
                boostRecent: true
              }
            },
            variables: [
              {
                name: 'brand',
                type: 'string' as const,
                required: false
              },
              {
                name: 'maxPrice',
                type: 'number' as const,
                required: false,
                defaultValue: 1000,
                validation: { min: 0, max: 10000 }
              }
            ],
            isActive: true,
            usageCount: 25,
            createdBy: 'manager',
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-02-10'),
            tags: ['mobile', 'phones', 'electronics']
          };

          const result = createSearchTemplate(input);

          expect(result.templateId).toBe('template-456');
          expect(result.name).toBe('Mobile Phones Search');
          expect(result.category).toBe('business_type');
          expect(result.variables).toHaveLength(2);
          expect(result.variables[0].name).toBe('brand');
          expect(result.variables[1].name).toBe('maxPrice');
          expect(result.isActive).toBe(true);
          expect(result.usageCount).toBe(25);
          expect(result.tags).toEqual(['mobile', 'phones', 'electronics']);
        });

        it('should throw error for invalid data', () => {
          const invalidInput = {
            templateId: 'template-123',
            name: 'Invalid Template'
            // Missing required fields
          };

          expect(() => createSearchTemplate(invalidInput)).toThrow('Invalid SearchTemplateDto data');
        });

        it('should handle minimal template data', () => {
          const input = {
            templateId: 'template-789',
            name: 'Simple Search',
            category: 'custom',
            baseQuery: {
              filters: {},
              sorting: {
                field: 'relevance',
                direction: 'desc' as SortDirection
              },
              pagination: { page: 1, limit: 10 },
              searchOptions: {}
            },
            variables: [],
            isActive: false,
            usageCount: 0,
            createdBy: 'user',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = createSearchTemplate(input);

          expect(result.templateId).toBe('template-789');
          expect(result.description).toBeUndefined();
          expect(result.tags).toBeUndefined();
          expect(result.variables).toEqual([]);
          expect(result.isActive).toBe(false);
        });
      });
    });
  });
});
