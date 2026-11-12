/**
 * Domain Event Versioning Policy
 * ENH-016: Formalizes versioning strategy and serialization contract for domain events.
 *
 * Versioning convention:
 * - eventVersion starts at 1 for all new events.
 * - Increment eventVersion when the event payload schema changes in a breaking way.
 * - Non-breaking additions (new optional fields) do not require a version bump.
 * - Consumers must tolerate unknown fields (forward compatibility).
 *
 * Correlation IDs:
 * - correlationId is optional but recommended for all write operations.
 * - When present it should be propagated to all events raised in the same request/saga.
 */

export interface DomainEventShape {
  eventId: string;
  eventType: string;
  eventVersion: number;
  aggregateId: string;
  occurredAt: Date | string;
  correlationId?: string | null;
}

export interface EventVersioningValidationResult {
  valid: boolean;
  errors: string[];
}

export class DomainEventVersioningPolicy {
  /**
   * The minimum supported event version. Events with a version below this
   * should be treated as legacy and may require migration.
   */
  static readonly MINIMUM_SUPPORTED_VERSION = 1;

  /**
   * Validates that a domain event has a well-formed versioning envelope.
   *
   * Rules:
   * - eventId must be a non-empty string
   * - eventType must be a non-empty string
   * - eventVersion must be a positive integer ≥ MINIMUM_SUPPORTED_VERSION
   * - aggregateId must be a non-empty string
   * - occurredAt must be a valid Date or ISO-8601 string
   */
  static validateEnvelope(event: DomainEventShape): EventVersioningValidationResult {
    const errors: string[] = [];

    if (!event.eventId || typeof event.eventId !== 'string' || event.eventId.trim().length === 0) {
      errors.push('eventId must be a non-empty string');
    }

    if (!event.eventType || typeof event.eventType !== 'string' || event.eventType.trim().length === 0) {
      errors.push('eventType must be a non-empty string');
    }

    if (
      typeof event.eventVersion !== 'number' ||
      !Number.isInteger(event.eventVersion) ||
      event.eventVersion < this.MINIMUM_SUPPORTED_VERSION
    ) {
      errors.push(`eventVersion must be an integer >= ${this.MINIMUM_SUPPORTED_VERSION}`);
    }

    if (!event.aggregateId || typeof event.aggregateId !== 'string' || event.aggregateId.trim().length === 0) {
      errors.push('aggregateId must be a non-empty string');
    }

    if (event.occurredAt) {
      const d = event.occurredAt instanceof Date
        ? event.occurredAt
        : new Date(event.occurredAt as string);
      if (isNaN(d.getTime())) {
        errors.push('occurredAt must be a valid Date or ISO-8601 string');
      }
    } else {
      errors.push('occurredAt is required');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Returns true if the event version is within the supported range.
   * Events with versions above the current maximum are forward-compatible
   * and should be processed with unknown fields ignored.
   */
  static isVersionSupported(eventVersion: number): boolean {
    return Number.isInteger(eventVersion) && eventVersion >= this.MINIMUM_SUPPORTED_VERSION;
  }

  /**
   * Returns the recommended next version for a breaking schema change.
   * Non-breaking additions (new optional fields) should keep the same version.
   */
  static nextBreakingVersion(currentVersion: number): number {
    return currentVersion + 1;
  }
}
