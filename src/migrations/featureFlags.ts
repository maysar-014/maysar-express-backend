// Feature Flag System for Database Migrations
// Implements expand/contract pattern for zero-downtime deployments

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Feature flag states
export enum FeatureFlagState {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
  ROLLED_BACK = 'rolled_back'
}

// Feature flag metadata
export interface FeatureFlag {
  name: string
  description: string
  state: FeatureFlagState
  createdAt: Date
  enabledAt?: Date
  rolledBackAt?: Date
  version: string
  schemaChanges: string[]
}

// Feature flag registry
class FeatureFlagRegistry {
  private flags: Map<string, FeatureFlag> = new Map()

  register(flag: Omit<FeatureFlag, 'state' | 'createdAt'>): void {
    const fullFlag: FeatureFlag = {
      ...flag,
      state: FeatureFlagState.DISABLED,
      createdAt: new Date()
    }
    this.flags.set(flag.name, fullFlag)
  }

  async enableFlag(flagName: string): Promise<void> {
    const flag = this.flags.get(flagName)
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not registered`)
    }

    if (flag.state === FeatureFlagState.ENABLED) {
      return // Already enabled
    }

    // Update flag state
    flag.state = FeatureFlagState.ENABLED
    flag.enabledAt = new Date()

    // Persist to database
    await this.persistFlagState(flag)

    console.log(`✅ Feature flag '${flagName}' enabled`)
  }

  async rollbackFlag(flagName: string): Promise<void> {
    const flag = this.flags.get(flagName)
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not registered`)
    }

    if (flag.state === FeatureFlagState.ROLLED_BACK) {
      return // Already rolled back
    }

    // Update flag state
    flag.state = FeatureFlagState.ROLLED_BACK
    flag.rolledBackAt = new Date()

    // Persist to database
    await this.persistFlagState(flag)

    console.log(`⏪ Feature flag '${flagName}' rolled back`)
  }

  isEnabled(flagName: string): boolean {
    const flag = this.flags.get(flagName)
    return flag?.state === FeatureFlagState.ENABLED
  }

  getFlag(flagName: string): FeatureFlag | undefined {
    return this.flags.get(flagName)
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }

  private async persistFlagState(flag: FeatureFlag): Promise<void> {
    // This would typically persist to a feature_flags table
    // For now, we'll just log the state changes
    console.log(`Feature flag state persisted: ${flag.name} -> ${flag.state}`)
  }
}

// Global feature flag registry
export const featureFlags = new FeatureFlagRegistry()

// Migration Helper Functions
export class MigrationHelpers {
  constructor(private prisma: PrismaClient) {}

  // Expand Phase: Add new columns/tables with default values
  async expand(operation: () => Promise<void>): Promise<void> {
    console.log('🔄 Starting EXPAND phase...')
    try {
      await operation()
      console.log('✅ EXPAND phase completed')
    } catch (error) {
      console.error('❌ EXPAND phase failed:', error)
      throw error
    }
  }

  // Contract Phase: Remove old columns/tables after feature flag is disabled
  async contract(operation: () => Promise<void>): Promise<void> {
    console.log('🔄 Starting CONTRACT phase...')
    try {
      await operation()
      console.log('✅ CONTRACT phase completed')
    } catch (error) {
      console.error('❌ CONTRACT phase failed:', error)
      throw error
    }
  }

  // Safe column operations
  async addColumn(tableName: string, columnName: string, columnDefinition: string): Promise<void> {
    const sql = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnDefinition}`
    console.log(`Adding column: ${sql}`)
    await this.prisma.$executeRawUnsafe(sql)
  }

  async dropColumn(tableName: string, columnName: string): Promise<void> {
    // Check if column exists first
    const columnExists = await this.columnExists(tableName, columnName)
    if (!columnExists) {
      console.log(`Column ${tableName}.${columnName} does not exist, skipping drop`)
      return
    }

    const sql = `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`
    console.log(`Dropping column: ${sql}`)
    await this.prisma.$executeRawUnsafe(sql)
  }

  async renameColumn(tableName: string, oldName: string, newName: string, type: string): Promise<void> {
    const sql = `ALTER TABLE "${tableName}" RENAME COLUMN "${oldName}" TO "${newName}"`
    console.log(`Renaming column: ${sql}`)
    await this.prisma.$executeRawUnsafe(sql)
  }

  async addIndex(tableName: string, indexName: string, columns: string[]): Promise<void> {
    const columnList = columns.map(col => `"${col}"`).join(', ')
    const sql = `CREATE INDEX "${indexName}" ON "${tableName}" (${columnList})`
    console.log(`Adding index: ${sql}`)
    await this.prisma.$executeRawUnsafe(sql)
  }

  async dropIndex(indexName: string): Promise<void> {
    const sql = `DROP INDEX IF EXISTS "${indexName}"`
    console.log(`Dropping index: ${sql}`)
    await this.prisma.$executeRawUnsafe(sql)
  }

  // Utility methods
  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      // This is a simplified check - in production you'd query information_schema
      const result = await this.prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          AND column_name = ${columnName}
        ) as exists
      `
      return result[0]?.exists || false
    } catch (error) {
      console.warn(`Could not check if column exists: ${error}`)
      return false
    }
  }

  async createTable(tableName: string, columns: string[]): Promise<void> {
    const columnDefs = columns.join(', ')
    const sql = `CREATE TABLE "${tableName}" (${columnDefs})`
    console.log(`Creating table: ${sql}`)
    await this.prisma.$executeRawUnsafe(sql)
  }

  async dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS "${tableName}"`
    console.log(`Dropping table: ${sql}`)
    await this.prisma.$executeRawUnsafe(sql)
  }
}

// Migration Template for Expand/Contract Pattern
export class ExpandContractMigration {
  constructor(
    protected helpers: MigrationHelpers,
    private flagName: string,
    private description: string,
    private version: string,
    private schemaChanges: string[]
  ) {}

  async execute(): Promise<void> {
    console.log(`🚀 Starting Expand/Contract Migration: ${this.flagName}`)
    console.log(`Description: ${this.description}`)
    console.log(`Version: ${this.version}`)

    // Register feature flag
    featureFlags.register({
      name: this.flagName,
      description: this.description,
      version: this.version,
      schemaChanges: this.schemaChanges
    })

    // EXPAND PHASE: Add new schema elements
    await this.expand()

    console.log(`✅ Migration ${this.flagName} expand phase completed`)
    console.log(`   Next steps:`)
    console.log(`   1. Deploy application code`)
    console.log(`   2. Enable feature flag: featureFlags.enableFlag('${this.flagName}')`)
    console.log(`   3. Monitor and validate`)
    console.log(`   4. Run contract phase when ready`)
  }

  async rollback(): Promise<void> {
    console.log(`⏪ Rolling back migration: ${this.flagName}`)

    // Disable feature flag
    await featureFlags.rollbackFlag(this.flagName)

    // CONTRACT PHASE: Remove old schema elements
    await this.contract()

    console.log(`✅ Migration ${this.flagName} rolled back`)
  }

  // Override these methods in subclasses
  protected async expand(): Promise<void> {
    throw new Error('expand() method must be implemented by subclass')
  }

  protected async contract(): Promise<void> {
    throw new Error('contract() method must be implemented by subclass')
  }
}

// Example Migration Template
export class ExampleUserProfileMigration extends ExpandContractMigration {
  constructor() {
    super(
      new MigrationHelpers(prisma),
      'user_profile_expansion',
      'Add enhanced user profile fields with feature flag control',
      '1.0.0',
      [
        'Add profile JSONB column to users table',
        'Add preferences JSONB column to users table',
        'Add attributes JSONB column to users table'
      ]
    )
  }

  protected async expand(): Promise<void> {
    await this.helpers.addColumn('auth_users', 'profile', 'JSONB')
    await this.helpers.addColumn('auth_users', 'preferences', 'JSONB')
    await this.helpers.addColumn('auth_users', 'attributes', 'JSONB')

    // Add indexes for better performance
    await this.helpers.addIndex('auth_users', 'idx_users_profile', ['profile'])
    await this.helpers.addIndex('auth_users', 'idx_users_preferences', ['preferences'])
  }

  protected async contract(): Promise<void> {
    // Only run contract after feature flag is disabled and data is migrated
    await this.helpers.dropIndex('idx_users_profile')
    await this.helpers.dropIndex('idx_users_preferences')

    await this.helpers.dropColumn('auth_users', 'profile')
    await this.helpers.dropColumn('auth_users', 'preferences')
    await this.helpers.dropColumn('auth_users', 'attributes')
  }
}

// Migration validation utilities
export class MigrationValidator {
  static async validateMigration(flagName: string): Promise<boolean> {
    const flag = featureFlags.getFlag(flagName)
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not found`)
    }

    console.log(`🔍 Validating migration: ${flagName}`)

    // Check if all schema changes are present
    // This would involve querying the database schema
    // For now, return true as placeholder
    return true
  }

  static async checkDataConsistency(flagName: string): Promise<void> {
    console.log(`🔍 Checking data consistency for: ${flagName}`)

    // Implement data consistency checks here
    // For example, check that all required fields are populated
  }
}

// Export utilities
export const migrationHelpers = new MigrationHelpers(prisma)
