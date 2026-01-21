import { IIdGenerator } from './id-generator.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * UUID-based ID generator implementation
 * Uses UUID v4 for generating unique identifiers
 */
export class UuidGeneratorService implements IIdGenerator {
  /**
   * Generates a unique identifier using UUID v4
   */
  generate(): string {
    return uuidv4();
  }
}
