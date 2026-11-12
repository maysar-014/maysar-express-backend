import { ConfigurationDefinitionData, ConfigurationDependencyData } from '../entities/configuration-definition.entity';

export interface DependencyConflict {
  code: string;
  message: string;
  optionIds: string[];
}

export interface DependencyResolutionResult {
  /** Options filtered by conditional dependencies — map of dimensionId → available optionIds */
  filteredOptions: Record<string, string[]>;
  /** Required option IDs that must be present based on 'required' dependencies */
  requiredSelections: string[];
  /** Conflicts detected (e.g. mutually exclusive violations) */
  conflicts: DependencyConflict[];
  /** Dependencies referencing non-existent options or dimensions */
  staleReferences: DependencyConflict[];
}

export class DependencyResolutionPolicy {
  /**
   * Evaluates dependency rules for a given set of selections.
   *
   * Returns:
   * - filteredOptions: For each dimension, the available option IDs after
   *   applying conditional dependencies
   * - requiredSelections: Option IDs that must be selected based on
   *   'required' dependencies
   * - conflicts: Mutually exclusive violations
   * - staleReferences: Dependencies referencing non-existent entities
   */
  static resolve(
    selections: Record<string, string[]>,
    definition: ConfigurationDefinitionData
  ): DependencyResolutionResult {
    const conflicts: DependencyConflict[] = [];
    const staleReferences: DependencyConflict[] = [];
    const requiredSelections: string[] = [];

    // Build option and dimension lookup sets
    const optionIds = new Set(definition.options.map(o => o.id));
    const dimensionIds = new Set(definition.dimensions.map(d => d.id));

    // Collect all selected option IDs
    const allSelected = new Set<string>();
    for (const opts of Object.values(selections)) {
      for (const id of opts) {
        allSelected.add(id);
      }
    }

    // Start with all options available for each dimension
    const filteredOptions: Record<string, string[]> = {};
    for (const dim of definition.dimensions) {
      filteredOptions[dim.id] = definition.options
        .filter(o => o.configurationDimensionId === dim.id)
        .map(o => o.id);
    }

    // Evaluate each dependency
    for (const dep of definition.dependencies) {
      // Check for stale references
      if (
        !dimensionIds.has(dep.sourceDimensionId) ||
        !optionIds.has(dep.sourceOptionId) ||
        !dimensionIds.has(dep.targetDimensionId) ||
        !dep.targetOptionIds.every(id => optionIds.has(id))
      ) {
        staleReferences.push({
          code: 'STALE_DEPENDENCY_REFERENCE',
          message: `Dependency ${dep.id} references non-existent dimension or option`,
          optionIds: [],
        });
        continue;
      }

      switch (dep.type) {
        case 'conditional':
          if (allSelected.has(dep.sourceOptionId)) {
            // Filter target dimension options to only those specified
            filteredOptions[dep.targetDimensionId] = dep.targetOptionIds;
          }
          break;

        case 'required':
          if (allSelected.has(dep.sourceOptionId)) {
            for (const targetOptId of dep.targetOptionIds) {
              if (!allSelected.has(targetOptId)) {
                requiredSelections.push(targetOptId);
              }
            }
          }
          break;

        case 'mutually_exclusive':
          // Check if both source and any target are selected
          if (allSelected.has(dep.sourceOptionId)) {
            for (const targetOptId of dep.targetOptionIds) {
              if (allSelected.has(targetOptId)) {
                conflicts.push({
                  code: 'MUTUALLY_EXCLUSIVE_VIOLATION',
                  message: `Options ${dep.sourceOptionId} and ${targetOptId} are mutually exclusive`,
                  optionIds: [dep.sourceOptionId, targetOptId],
                });
              }
            }
          }
          break;

        case 'dependent':
        case 'optional':
          // No enforcement for dependent/optional in this phase
          break;
      }
    }

    return {
      filteredOptions,
      requiredSelections,
      conflicts,
      staleReferences,
    };
  }
}
