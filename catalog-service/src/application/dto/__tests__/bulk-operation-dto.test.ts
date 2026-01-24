/**
 * Bulk Operation DTO Tests
 * Tests for bulk operation data transfer objects and their validation logic
 */

import {
  BulkOperationCommandDto,
  BulkOperationResultDto,
  BulkOperationTemplateDto,
  isBulkOperationCommandDto,
  isBulkOperationResultDto,
  isBulkOperationTemplateDto,
  createBulkOperationCommand,
  createBulkOperationTemplate,
  BulkOperationType,
  BulkOperationStatus,
  BulkOperationPriority
} from '../bulk-operation-dto';

describe('BulkOperationCommandDto', () => {
  describe('Type Guards', () => {
    describe('isBulkOperationCommandDto', () => {
      it('should return true for valid BulkOperationCommandDto', () => {
        const validDto: BulkOperationCommandDto = {
          operationId: 'test-op-123',
          operationType: 'product_update' as BulkOperationType,
          name: 'Test Bulk Update',
          priority: 'normal' as BulkOperationPriority,
          targetItems: ['item1', 'item2'],
          operationData: { field: 'value' },
          options: {
            batchSize: 10,
            continueOnError: true
          },
          metadata: {
            requestedBy: 'user123',
            requestId: 'req-123',
            source: 'api'
          }
        };

        expect(isBulkOperationCommandDto(validDto)).toBe(true);
      });

      it('should return false for invalid data', () => {
        expect(isBulkOperationCommandDto(null)).toBe(false);
        expect(isBulkOperationCommandDto({})).toBe(false);
        expect(isBulkOperationCommandDto({ operationId: 'test' })).toBe(false);
        expect(isBulkOperationCommandDto({
          operationId: 'test',
          operationType: 'invalid_type',
          name: 'test',
          priority: 'normal',
          targetItems: [],
          operationData: {},
          options: {},
          metadata: { requestedBy: 'user', requestId: 'req', source: 'api' }
        })).toBe(false);
      });

      it('should return false when required fields are missing', () => {
        const incompleteDto = {
          operationId: 'test-op-123',
          operationType: 'product_update' as BulkOperationType,
          // Missing name, priority, targetItems, etc.
        };

        expect(isBulkOperationCommandDto(incompleteDto)).toBe(false);
      });

      it('should validate operation types', () => {
        const baseDto = {
          operationId: 'test-op-123',
          operationType: 'product_update' as BulkOperationType,
          name: 'Test Operation',
          priority: 'normal' as BulkOperationPriority,
          targetItems: ['item1'],
          operationData: {},
          options: {},
          metadata: {
            requestedBy: 'user123',
            requestId: 'req-123',
            source: 'api'
          }
        };

        // Valid types
        const validTypes: BulkOperationType[] = [
          'product_update', 'pricing_update', 'inventory_update',
          'category_change', 'status_change', 'media_upload',
          'tag_management', 'seo_update', 'campaign_assignment', 'bulk_delete'
        ];

        validTypes.forEach(type => {
          expect(isBulkOperationCommandDto({
            ...baseDto,
            operationType: type
          })).toBe(true);
        });

        // Invalid type
        expect(isBulkOperationCommandDto({
          ...baseDto,
          operationType: 'invalid_type' as any
        })).toBe(false);
      });

      it('should validate priority levels', () => {
        const baseDto = {
          operationId: 'test-op-123',
          operationType: 'product_update' as BulkOperationType,
          name: 'Test Operation',
          priority: 'normal' as BulkOperationPriority,
          targetItems: ['item1'],
          operationData: {},
          options: {},
          metadata: {
            requestedBy: 'user123',
            requestId: 'req-123',
            source: 'api'
          }
        };

        const validPriorities: BulkOperationPriority[] = ['low', 'normal', 'high', 'critical'];

        validPriorities.forEach(priority => {
          expect(isBulkOperationCommandDto({
            ...baseDto,
            priority
          })).toBe(true);
        });

        expect(isBulkOperationCommandDto({
          ...baseDto,
          priority: 'invalid' as any
        })).toBe(false);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createBulkOperationCommand', () => {
      it('should create a valid BulkOperationCommandDto from valid data', () => {
        const input = {
          operationId: 'test-op-123',
          operationType: 'product_update' as BulkOperationType,
          name: 'Test Bulk Update',
          priority: 'high' as BulkOperationPriority,
          targetItems: ['item1', 'item2', 'item3'],
          operationData: { updateField: 'newValue' },
          options: {
            batchSize: 50,
            continueOnError: false,
            validateBeforeExecute: true
          },
          metadata: {
            requestedBy: 'user456',
            requestId: 'req-456',
            source: 'ui',
            tags: ['urgent', 'bulk']
          }
        };

        const result = createBulkOperationCommand(input);

        expect(result).toEqual({
          ...input,
          targetItems: ['item1', 'item2', 'item3'], // Should be copied
          operationData: { updateField: 'newValue' }, // Should be copied
          options: {
            batchSize: 50,
            continueOnError: false,
            validateBeforeExecute: true
          }, // Should be copied
          metadata: {
            requestedBy: 'user456',
            requestId: 'req-456',
            source: 'ui',
            tags: ['urgent', 'bulk'] // Should be copied
          }
        });
      });

      it('should throw error for invalid data', () => {
        const invalidInput = {
          operationId: 'test-op-123'
          // Missing required fields
        };

        expect(() => createBulkOperationCommand(invalidInput)).toThrow('Invalid BulkOperationCommandDto data');
      });

      it('should handle optional fields correctly', () => {
        const input = {
          operationId: 'test-op-123',
          operationType: 'product_update' as BulkOperationType,
          name: 'Minimal Operation',
          priority: 'low' as BulkOperationPriority,
          targetItems: ['item1'],
          operationData: {},
          options: {},
          metadata: {
            requestedBy: 'user123',
            requestId: 'req-123',
            source: 'api'
          }
        };

        const result = createBulkOperationCommand(input);

        expect(result.operationId).toBe('test-op-123');
        expect(result.name).toBe('Minimal Operation');
        expect(result.priority).toBe('low');
        expect(result.targetItems).toEqual(['item1']);
        expect(result.operationData).toEqual({});
        expect(result.options).toEqual({});
        expect(result.metadata.requestedBy).toBe('user123');
      });
    });
  });

  describe('BulkOperationResultDto', () => {
    describe('Type Guards', () => {
      describe('isBulkOperationResultDto', () => {
        it('should return true for valid BulkOperationResultDto', () => {
          const validDto: BulkOperationResultDto = {
            operationId: 'test-op-123',
            operationType: 'product_update' as BulkOperationType,
            status: 'completed' as BulkOperationStatus,
            summary: {
              totalItems: 100,
              successfulItems: 95,
              failedItems: 5,
              skippedItems: 0,
              successRate: 0.95,
              totalProcessingTime: 5000,
              averageProcessingTime: 50
            },
            results: {
              successful: [],
              failed: [],
              skipped: []
            },
            analytics: {
              operationMetrics: { duration: 5000 },
              performanceMetrics: {
                throughput: 20,
                efficiency: 0.9,
                resourceUtilization: 0.75
              },
              errorAnalysis: {
                commonErrors: [],
                errorPatterns: []
              }
            },
            metadata: {
              name: 'Test Operation',
              requestedBy: 'user123',
              requestId: 'req-123',
              startedAt: new Date(),
              completedAt: new Date()
            }
          };

          expect(isBulkOperationResultDto(validDto)).toBe(true);
        });

        it('should return false for invalid data', () => {
          expect(isBulkOperationResultDto(null)).toBe(false);
          expect(isBulkOperationResultDto({})).toBe(false);
          expect(isBulkOperationResultDto({ operationId: 'test' })).toBe(false);
        });

        it('should validate status values', () => {
          const baseDto = {
            operationId: 'test-op-123',
            operationType: 'product_update' as BulkOperationType,
            status: 'completed' as BulkOperationStatus,
            summary: {
              totalItems: 10,
              successfulItems: 10,
              failedItems: 0,
              skippedItems: 0,
              successRate: 1.0,
              totalProcessingTime: 1000,
              averageProcessingTime: 100
            },
            results: {
              successful: [],
              failed: [],
              skipped: []
            },
            analytics: {
              operationMetrics: {},
              performanceMetrics: {
                throughput: 1,
                efficiency: 1,
                resourceUtilization: 0.1
              },
              errorAnalysis: {
                commonErrors: [],
                errorPatterns: []
              }
            },
            metadata: {
              name: 'Test',
              requestedBy: 'user',
              requestId: 'req',
              startedAt: new Date(),
              completedAt: new Date()
            }
          };

          const validStatuses: BulkOperationStatus[] = [
            'pending', 'processing', 'completed', 'failed',
            'cancelled', 'partial_success'
          ];

          validStatuses.forEach(status => {
            expect(isBulkOperationResultDto({
              ...baseDto,
              status
            })).toBe(true);
          });

          expect(isBulkOperationResultDto({
            ...baseDto,
            status: 'invalid_status' as any
          })).toBe(false);
        });
      });
    });
  });

  describe('BulkOperationTemplateDto', () => {
    describe('Type Guards', () => {
      describe('isBulkOperationTemplateDto', () => {
        it('should return true for valid BulkOperationTemplateDto', () => {
          const validDto: BulkOperationTemplateDto = {
            templateId: 'template-123',
            name: 'Product Price Update',
            description: 'Update prices for multiple products',
            operationType: 'pricing_update' as BulkOperationType,
            category: 'operations',
            baseCommand: {
              operationType: 'pricing_update' as BulkOperationType,
              name: 'Price Update',
              priority: 'normal' as BulkOperationPriority,
              targetItems: [],
              operationData: {},
              options: {},
              metadata: {
                requestedBy: '',
                requestId: '',
                source: 'template'
              }
            },
            variables: [
              {
                name: 'priceMultiplier',
                type: 'number',
                required: true,
                description: 'Multiplier for price adjustment'
              }
            ],
            isActive: true,
            usageCount: 5,
            createdBy: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: ['pricing', 'bulk']
          };

          expect(isBulkOperationTemplateDto(validDto)).toBe(true);
        });

        it('should return false for invalid data', () => {
          expect(isBulkOperationTemplateDto(null)).toBe(false);
          expect(isBulkOperationTemplateDto({})).toBe(false);
          expect(isBulkOperationTemplateDto({
            templateId: 'template-123',
            name: 'Test Template'
            // Missing required fields
          })).toBe(false);
        });

        it('should validate category values', () => {
          const baseDto = {
            templateId: 'template-123',
            name: 'Test Template',
            operationType: 'product_update' as BulkOperationType,
            category: 'operations',
            baseCommand: {
              operationType: 'product_update' as BulkOperationType,
              name: 'Test',
              priority: 'normal' as BulkOperationPriority,
              targetItems: [],
              operationData: {},
              options: {},
              metadata: {
                requestedBy: 'user',
                requestId: 'req',
                source: 'template'
              }
            },
            variables: [],
            isActive: true,
            usageCount: 0,
            createdBy: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const validCategories = ['maintenance', 'marketing', 'operations', 'compliance', 'custom'];

          validCategories.forEach(category => {
            expect(isBulkOperationTemplateDto({
              ...baseDto,
              category: category as any
            })).toBe(true);
          });

          expect(isBulkOperationTemplateDto({
            ...baseDto,
            category: 'invalid_category' as any
          })).toBe(false);
        });
      });
    });

    describe('Factory Functions', () => {
      describe('createBulkOperationTemplate', () => {
        it('should create a valid BulkOperationTemplateDto from valid data', () => {
          const input = {
            templateId: 'template-456',
            name: 'Inventory Update Template',
            description: 'Template for bulk inventory updates',
            operationType: 'inventory_update' as BulkOperationType,
            category: 'operations',
            baseCommand: {
              operationType: 'inventory_update' as BulkOperationType,
              name: 'Inventory Update',
              priority: 'high' as BulkOperationPriority,
              targetItems: [],
              operationData: { operation: 'add', quantity: 10 },
              options: { validateBeforeExecute: true },
              metadata: {
                requestedBy: '',
                requestId: '',
                source: 'template'
              }
            },
            variables: [
              {
                name: 'quantity',
                type: 'number' as const,
                required: true,
                defaultValue: 1,
                description: 'Quantity to add/subtract'
              }
            ],
            isActive: true,
            usageCount: 10,
            createdBy: 'admin',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-15'),
            tags: ['inventory', 'template']
          };

          const result = createBulkOperationTemplate(input);

          expect(result.templateId).toBe('template-456');
          expect(result.name).toBe('Inventory Update Template');
          expect(result.operationType).toBe('inventory_update');
          expect(result.category).toBe('operations');
          expect(result.variables).toHaveLength(1);
          expect(result.variables[0].name).toBe('quantity');
          expect(result.isActive).toBe(true);
          expect(result.usageCount).toBe(10);
          expect(result.tags).toEqual(['inventory', 'template']);
        });

        it('should throw error for invalid data', () => {
          const invalidInput = {
            templateId: 'template-123',
            name: 'Invalid Template'
            // Missing required fields
          };

          expect(() => createBulkOperationTemplate(invalidInput)).toThrow('Invalid BulkOperationTemplateDto data');
        });

        it('should handle optional fields correctly', () => {
          const input = {
            templateId: 'template-789',
            name: 'Minimal Template',
            operationType: 'product_update' as BulkOperationType,
            category: 'maintenance',
            baseCommand: {
              operationType: 'product_update' as BulkOperationType,
              name: 'Update',
              priority: 'normal' as BulkOperationPriority,
              targetItems: [],
              operationData: {},
              options: {},
              metadata: {
                requestedBy: 'user',
                requestId: 'req',
                source: 'template'
              }
            },
            variables: [],
            isActive: false,
            usageCount: 0,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
            // No description, tags, etc.
          };

          const result = createBulkOperationTemplate(input);

          expect(result.templateId).toBe('template-789');
          expect(result.description).toBeUndefined();
          expect(result.tags).toBeUndefined();
        });
      });
    });
  });
});
