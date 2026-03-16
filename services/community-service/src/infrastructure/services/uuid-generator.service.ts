import { IIdGenerator } from './id-generator.interface';
import { makeId } from '@shared/ids/id';

/**
 * ULID-based ID generator implementation
 * Uses prefixed ULIDs for generating unique identifiers
 */
export class UuidGeneratorService implements IIdGenerator {
  /**
   * Generates a unique identifier using prefixed ULIDs
   */
  generate(): string {
    return makeId('cmm_post');
  }
}
