/**
 * Configuration Routes
 * ENH-009: API contracts for configuration definition retrieval,
 * validation, and resolution.
 *
 * Constitution §22-23:
 * - Retrieve configuration definition
 * - Validate a configuration
 * - Resolve a selected configuration
 * - Retrieve valid discrete combinations
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '@shared/middleware/auth-context.middleware';
import { prisma } from '../../../../../src/config/prisma';

export function createConfigurationRoutes(): Router {
  const router = Router();

  /**
   * Retrieve configuration definition for a product
   * GET /v1/products/:productId/configuration
   *
   * Returns the ConfigurationDefinition (dimensions, options, dependencies, constraints)
   * for the given product. Returns 404 if the product has no configuration (simple product).
   */
  router.get('/v1/products/:productId/configuration', async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      // Look up the active configuration definition for this product
      const definition = await (prisma as any).catalog_ConfigurationDefinition?.findFirst({
        where: { productId, status: 'active' },
      });

      if (!definition) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No active configuration definition for this product' },
        });
        return;
      }

      // Parse the JSON columns
      const dimensions = typeof definition.dimensions === 'string' ? JSON.parse(definition.dimensions) : definition.dimensions;
      const options = typeof definition.options === 'string' ? JSON.parse(definition.options) : definition.options;
      const dependencies = typeof definition.dependencies === 'string' ? JSON.parse(definition.dependencies) : definition.dependencies;
      const constraints = typeof definition.constraints === 'string' ? JSON.parse(definition.constraints) : definition.constraints;

      // Get active combinations
      const combinations = await (prisma as any).catalog_ConfigurationCombination?.findMany({
        where: { configurationDefinitionId: definition.id, active: true },
      }) ?? [];

      res.status(200).json({
        success: true,
        data: {
          id: definition.id,
          productId: definition.productId,
          version: definition.version,
          status: definition.status,
          dimensions,
          options,
          dependencies,
          constraints,
          combinations: combinations.map((c: any) => ({
            id: c.id,
            optionSelections: typeof c.optionSelections === 'string' ? JSON.parse(c.optionSelections) : c.optionSelections,
            fingerprint: c.fingerprint,
            active: c.active,
          })),
        },
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('ConfigurationRoutes.getConfiguration error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve configuration' },
      });
    }
  });

  /**
   * Validate a configuration against a product's definition
   * POST /v1/products/:productId/validate-configuration
   *
   * Body: { selections: Record<string, string[]> }
   * Returns: { valid: boolean, errors: ValidationFieldError[] }
   */
  router.post('/v1/products/:productId/validate-configuration', async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { selections } = req.body;

      if (!selections || typeof selections !== 'object') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'selections object is required' },
        });
        return;
      }

      const { ConfigurationValidationPolicy } = require('../../domain/policies/configuration-validation.policy');

      // Look up the active configuration definition
      const definition = await (prisma as any).catalog_ConfigurationDefinition?.findFirst({
        where: { productId, status: 'active' },
      });

      if (!definition) {
        // Simple product — no configuration needed
        res.status(200).json({
          success: true,
          data: { valid: true, errors: [] },
          meta: { timestamp: new Date() },
        });
        return;
      }

      // Reconstruct ConfigurationDefinitionData
      const defData = {
        id: definition.id,
        productId: definition.productId,
        version: definition.version,
        status: definition.status,
        dimensions: typeof definition.dimensions === 'string' ? JSON.parse(definition.dimensions) : definition.dimensions,
        options: typeof definition.options === 'string' ? JSON.parse(definition.options) : definition.options,
        dependencies: typeof definition.dependencies === 'string' ? JSON.parse(definition.dependencies) : definition.dependencies,
        constraints: typeof definition.constraints === 'string' ? JSON.parse(definition.constraints) : definition.constraints,
        combinations: (await (prisma as any).catalog_ConfigurationCombination?.findMany({
          where: { configurationDefinitionId: definition.id },
        }) ?? []).map((c: any) => ({
          id: c.id,
          configurationDefinitionId: definition.id,
          optionSelections: typeof c.optionSelections === 'string' ? JSON.parse(c.optionSelections) : c.optionSelections,
          fingerprint: c.fingerprint,
          active: c.active,
        })),
        predecessorVersionId: definition.predecessorVersionId,
        createdAt: definition.createdAt?.toISOString?.() ?? definition.createdAt,
        updatedAt: definition.updatedAt?.toISOString?.() ?? definition.updatedAt,
      };

      const result = ConfigurationValidationPolicy.validate(selections, defData);

      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('ConfigurationRoutes.validateConfiguration error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to validate configuration' },
      });
    }
  });

  /**
   * Resolve a selected configuration against a product's definition
   * POST /v1/products/:productId/resolve-configuration
   *
   * Body: { selections: Record<string, string[]> }
   * Returns: resolved variant/fingerprint, valid combinations, price/availability hints
   */
  router.post('/v1/products/:productId/resolve-configuration', async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { selections } = req.body;

      if (!selections || typeof selections !== 'object') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'selections object is required' },
        });
        return;
      }

      const { ConfigurationValidationPolicy } = require('../../domain/policies/configuration-validation.policy');
      const { ConfigurationFingerprintAlgorithm } = require('../../domain/algorithms/configuration-fingerprint.algorithm');

      // Look up the active configuration definition
      const definition = await (prisma as any).catalog_ConfigurationDefinition?.findFirst({
        where: { productId, status: 'active' },
      });

      if (!definition) {
        // Simple product — no configuration to resolve
        res.status(200).json({
          success: true,
          data: {
            resolved: true,
            variantId: null,
            fingerprint: null,
            configurationDefinitionVersion: null,
            valid: true,
            errors: [],
          },
          meta: { timestamp: new Date() },
        });
        return;
      }

      // Reconstruct ConfigurationDefinitionData
      const dimensions = typeof definition.dimensions === 'string' ? JSON.parse(definition.dimensions) : definition.dimensions;
      const options = typeof definition.options === 'string' ? JSON.parse(definition.options) : definition.options;
      const dependencies = typeof definition.dependencies === 'string' ? JSON.parse(definition.dependencies) : definition.dependencies;
      const constraints = typeof definition.constraints === 'string' ? JSON.parse(definition.constraints) : definition.constraints;

      const combinations = await (prisma as any).catalog_ConfigurationCombination?.findMany({
        where: { configurationDefinitionId: definition.id },
      }) ?? [];

      const defData = {
        id: definition.id,
        productId: definition.productId,
        version: definition.version,
        status: definition.status,
        dimensions,
        options,
        dependencies,
        constraints,
        combinations: combinations.map((c: any) => ({
          id: c.id,
          configurationDefinitionId: definition.id,
          optionSelections: typeof c.optionSelections === 'string' ? JSON.parse(c.optionSelections) : c.optionSelections,
          fingerprint: c.fingerprint,
          active: c.active,
        })),
        predecessorVersionId: definition.predecessorVersionId,
        createdAt: definition.createdAt?.toISOString?.() ?? definition.createdAt,
        updatedAt: definition.updatedAt?.toISOString?.() ?? definition.updatedAt,
      };

      // Step 1: Validate the configuration
      const validationResult = ConfigurationValidationPolicy.validate(selections, defData);

      // Step 2: Compute fingerprint
      let fingerprint: string | null = null;
      if (validationResult.valid) {
        try {
          const optionMap = new Map(options.map((o: any) => [o.id, o.normalizedValue]));
          const normalizedSelections: Record<string, string[]> = {};
          for (const [dimId, optIds] of Object.entries(selections)) {
            normalizedSelections[dimId] = (optIds as string[]).map((id: string) => (optionMap.get(id) ?? id) as string);
          }
          fingerprint = ConfigurationFingerprintAlgorithm.generateFingerprint({
            configurationDefinitionId: defData.id,
            selections: normalizedSelections,
          });
        } catch {
          fingerprint = null;
        }
      }

      // Step 3: Match against active combinations (sparse matrix enforcement)
      let matchedCombination: any = null;
      if (fingerprint) {
        matchedCombination = combinations.find((c: any) => c.fingerprint === fingerprint && c.active) ?? null;
      }

      // Step 4: Get display values for the resolved configuration
      const optionDisplayMap = new Map(options.map((o: any) => [o.id, o.displayValue]));
      const resolvedConfiguration: Record<string, string> = {};
      for (const [dimId, optIds] of Object.entries(selections)) {
        resolvedConfiguration[dimId] = (optIds as string[]).map(id => optionDisplayMap.get(id) || id).join(', ');
      }

      res.status(200).json({
        success: true,
        data: {
          resolved: validationResult.valid,
          variantId: matchedCombination?.id ?? null,
          fingerprint,
          configurationDefinitionVersion: definition.version,
          valid: validationResult.valid,
          errors: validationResult.errors,
          resolvedConfiguration,
          isSparseCombination: combinations.length > 0,
          combinationExists: matchedCombination !== null,
        },
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('ConfigurationRoutes.resolveConfiguration error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve configuration' },
      });
    }
  });

  return router;
}
