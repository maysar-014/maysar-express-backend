// Zero-Downtime Migration Example: Adding Required User Preferences
// Demonstrates the complete expand/contract + backfill pattern

import { PrismaClient } from '@prisma/client'
import { ExpandContractMigration, MigrationHelpers, featureFlags } from './featureFlags'

const prisma = new PrismaClient()

/**
 * ZERO-DOWNTIME MIGRATION WORKFLOW
 *
 * Step 1: Deploy nullable column
 * Step 2: Backfill data with background job
 * Step 3: Make column required, remove old logic
 * Rollback: Previous service binary deployment
 */

// ============================================================================
// STEP 1: EXPAND PHASE - Add nullable column with feature flag
// ============================================================================

export class AddUserPreferencesExpandMigration extends ExpandContractMigration {
  constructor() {
    super(
      new MigrationHelpers(prisma),
      'user_preferences_expand',
      'Add nullable user preferences column for zero-downtime migration',
      '1.0.0',
      [
        'Add preferences JSONB column (nullable) to auth_users table',
        'Add backfill_status column to track migration progress'
      ]
    )
  }

  protected async expand(): Promise<void> {
    // Add nullable column - safe for existing data
    await this.helpers.addColumn('auth_users', 'preferences', 'JSONB')

    // Add backfill tracking column
    await this.helpers.addColumn('auth_users', 'backfill_status', 'TEXT DEFAULT \'pending\'')

    // Add index for performance
    await this.helpers.addIndex('auth_users', 'idx_user_preferences', ['preferences'])
    await this.helpers.addIndex('auth_users', 'idx_backfill_status', ['backfill_status'])
  }

  protected async contract(): Promise<void> {
    // Contract phase - remove added columns
    await this.helpers.dropIndex('idx_user_preferences')
    await this.helpers.dropIndex('idx_backfill_status')
    await this.helpers.dropColumn('auth_users', 'preferences')
    await this.helpers.dropColumn('auth_users', 'backfill_status')
  }
}

// ============================================================================
// STEP 2: DATA BACKFILL SYSTEM
// ============================================================================

export class DataBackfillService {
  private readonly BATCH_SIZE = 1000
  private readonly MAX_CONCURRENT_BATCHES = 5

  constructor(private prisma: PrismaClient) {}

  /**
   * Background job to backfill user preferences
   * Can be run as a separate service or cron job
   */
  async backfillUserPreferences(): Promise<void> {
    console.log('🚀 Starting user preferences backfill...')

    let processed = 0

    // Use raw SQL since backfill_status column may not exist in Prisma types yet
    while (true) {
      // Get batch of users needing backfill
      const users = await this.prisma.$queryRaw<Array<{
        id: string
        email: string
        preferences: any
        created_at: Date
      }>>`
        SELECT id, email, preferences, created_at
        FROM auth_users
        WHERE COALESCE(backfill_status, 'pending') = 'pending'
        ORDER BY created_at ASC
        LIMIT ${this.BATCH_SIZE}
      `

      if (users.length === 0) {
        console.log('✅ Backfill completed!')
        break
      }

      // Get total count for progress tracking (only first time)
      let totalUsers = processed + users.length
      if (processed === 0) {
        const countResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM auth_users
          WHERE COALESCE(backfill_status, 'pending') = 'pending'
        `
        totalUsers = Number(countResult[0]?.count || 0)
        console.log(`📊 Backfilling ${totalUsers} users...`)
      }

      // Process batch concurrently
      const batchPromises = users.map(user => this.backfillSingleUser(user))
      await Promise.allSettled(batchPromises)

      processed += users.length
      const progress = ((processed / totalUsers) * 100).toFixed(1)
      console.log(`📈 Progress: ${processed}/${totalUsers} users (${progress}%)`)
    }
  }

  private async backfillSingleUser(user: any): Promise<void> {
    try {
      // Generate default preferences based on user data
      const defaultPreferences = this.generateDefaultPreferences(user)

      // Update user with backfilled data using raw SQL
      await this.prisma.$executeRaw`
        UPDATE auth_users
        SET preferences = ${JSON.stringify(defaultPreferences)},
            backfill_status = 'completed'
        WHERE id = ${user.id}
      `
    } catch (error) {
      console.error(`❌ Failed to backfill user ${user.id}:`, error)

      // Mark as failed for retry using raw SQL
      try {
        await this.prisma.$executeRaw`
          UPDATE auth_users
          SET backfill_status = 'failed'
          WHERE id = ${user.id}
        `
      } catch (updateError) {
        console.error(`❌ Failed to mark user ${user.id} as failed:`, updateError)
      }
    }
  }

  private generateDefaultPreferences(user: any): any {
    // Business logic to generate default preferences
    return {
      theme: 'light',
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      language: 'en',
      timezone: 'Africa/Dar_es_Salaam',
      currency: 'TZS',
      privacy: {
        profileVisible: true,
        showOnlineStatus: true
      },
      // Add more defaults based on your business logic
      marketingEmails: false,
      dataExport: {
        lastExport: null,
        frequency: 'monthly'
      }
    }
  }

  /**
   * Check backfill progress
   */
  async getBackfillProgress(): Promise<{
    total: number
    completed: number
    pending: number
    failed: number
    progress: number
  }> {
    // Use raw SQL since columns may not exist in Prisma types yet
    const results = await this.prisma.$queryRaw<
      Array<{ status: string; count: bigint }>
    >`
      SELECT
        COALESCE(backfill_status, 'no_column') as status,
        COUNT(*) as count
      FROM auth_users
      GROUP BY backfill_status
    `

    let total = 0
    let completed = 0
    let pending = 0
    let failed = 0

    for (const row of results) {
      const count = Number(row.count)
      total += count

      switch (row.status) {
        case 'completed':
          completed = count
          break
        case 'pending':
          pending = count
          break
        case 'failed':
          failed = count
          break
        case 'no_column':
          // Column doesn't exist yet, all users are "pending"
          pending = count
          break
      }
    }

    return {
      total,
      completed,
      pending,
      failed,
      progress: total > 0 ? (completed / total) * 100 : 0
    }
  }

  /**
   * Retry failed backfills
   */
  async retryFailedBackfills(): Promise<void> {
    console.log('🔄 Retrying failed backfills...')

    // Use raw SQL since column may not exist in Prisma types
    await this.prisma.$executeRaw`
      UPDATE auth_users
      SET backfill_status = 'pending'
      WHERE backfill_status = 'failed'
    `

    console.log('✅ Failed backfills marked for retry')
  }
}

// ============================================================================
// STEP 3: CONTRACT PHASE - Make column required and clean up
// ============================================================================

export class AddUserPreferencesContractMigration extends ExpandContractMigration {
  constructor() {
    super(
      new MigrationHelpers(prisma),
      'user_preferences_contract',
      'Make user preferences column required and clean up backfill data',
      '1.1.0',
      [
        'Make preferences column NOT NULL',
        'Remove backfill_status column',
        'Update application logic to use new schema'
      ]
    )
  }

  protected async expand(): Promise<void> {
    // This migration runs after backfill is complete
    // Make column required
    await this.makePreferencesRequired()

    // Remove backfill tracking column
    await this.helpers.dropColumn('auth_users', 'backfill_status')

    // Update indexes if needed
    await this.helpers.dropIndex('idx_backfill_status')
  }

  protected async contract(): Promise<void> {
    // Emergency rollback - make column nullable again
    await this.makePreferencesNullable()

    // Add back backfill tracking
    await this.helpers.addColumn('auth_users', 'backfill_status', 'TEXT DEFAULT \'completed\'')
    await this.helpers.addIndex('auth_users', 'idx_backfill_status', ['backfill_status'])
  }

  private async makePreferencesRequired(): Promise<void> {
    // First ensure all records have values (backfill should have done this)
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM auth_users WHERE preferences IS NULL
    `
    const nullCount = Number(result[0]?.count || 0)

    if (nullCount > 0) {
      throw new Error(`Cannot make preferences required: ${nullCount} users still have null preferences`)
    }

    // Make column NOT NULL
    const sql = `ALTER TABLE "auth_users" ALTER COLUMN "preferences" SET NOT NULL`
    console.log('Making preferences column required:', sql)
    await prisma.$executeRawUnsafe(sql)
  }

  private async makePreferencesNullable(): Promise<void> {
    // Emergency rollback - make column nullable again
    const sql = `ALTER TABLE "auth_users" ALTER COLUMN "preferences" DROP NOT NULL`
    console.log('Making preferences column nullable for rollback:', sql)
    await prisma.$executeRawUnsafe(sql)
  }
}

// ============================================================================
// APPLICATION CODE - Feature Flag Aware
// ============================================================================

export class UserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get user preferences - feature flag aware
   */
  async getUserPreferences(userId: string): Promise<any> {
    // Feature flag check - use old logic if feature not enabled
    if (!featureFlags.isEnabled('user_preferences_expand')) {
      return this.getDefaultPreferences()
    }

    // Use raw SQL since preferences column may not exist in Prisma types yet
    try {
      const result = await this.prisma.$queryRaw<Array<{ preferences: any }>>`
        SELECT preferences FROM auth_users WHERE id = ${userId}
      `

      if (!result || result.length === 0) {
        throw new Error('User not found')
      }

      return result[0].preferences || this.getDefaultPreferences()
    } catch (error) {
      // Column might not exist yet, fallback to defaults
      console.warn('Preferences column not accessible, using defaults:', error)
      return this.getDefaultPreferences()
    }
  }

  /**
   * Update user preferences - feature flag aware
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    if (!featureFlags.isEnabled('user_preferences_expand')) {
      // Store in external system or ignore
      console.log('Preferences update ignored - feature not enabled')
      return
    }

    // Validate preferences schema
    this.validatePreferences(preferences)

    // Use raw SQL since preferences column may not exist in Prisma types yet
    try {
      await this.prisma.$executeRaw`
        UPDATE auth_users
        SET preferences = ${JSON.stringify(preferences)}
        WHERE id = ${userId}
      `
    } catch (error) {
      console.warn('Failed to update preferences:', error)
      throw new Error('Unable to update user preferences at this time')
    }
  }

  private getDefaultPreferences(): any {
    return {
      theme: 'light',
      notifications: { email: true, sms: false, push: true },
      language: 'en',
      timezone: 'Africa/Dar_es_Salaam'
    }
  }

  private validatePreferences(preferences: any): void {
    // Add your validation logic here
    if (!preferences || typeof preferences !== 'object') {
      throw new Error('Invalid preferences format')
    }

    // Validate required fields, types, etc.
  }
}

// ============================================================================
// MIGRATION ORCHESTRATOR - Complete Workflow
// ============================================================================

export class ZeroDowntimeMigrationOrchestrator {
  private backfillService: DataBackfillService

  constructor(private prisma: PrismaClient) {
    this.backfillService = new DataBackfillService(prisma)
  }

  /**
   * Execute complete zero-downtime migration workflow
   */
  async executeZeroDowntimeMigration(): Promise<void> {
    console.log('🚀 Starting Zero-Downtime Migration Workflow')
    console.log('==============================================')

    try {
      // PHASE 1: EXPAND - Deploy nullable column
      console.log('\n📦 PHASE 1: EXPAND')
      const expandMigration = new AddUserPreferencesExpandMigration()
      await expandMigration.execute()

      // Enable feature flag for expand phase
      await featureFlags.enableFlag('user_preferences_expand')
      console.log('✅ Expand phase completed - nullable column deployed')

      // PHASE 2: BACKFILL - Populate data
      console.log('\n🔄 PHASE 2: BACKFILL')
      console.log('Starting background data backfill...')

      // Start backfill process (in production, this would be a separate job)
      await this.backfillService.backfillUserPreferences()

      // Verify backfill completion
      const progress = await this.backfillService.getBackfillProgress()
      if (progress.progress < 100) {
        throw new Error(`Backfill incomplete: ${progress.progress}% completed`)
      }

      console.log('✅ Data backfill completed')

      // PHASE 3: CONTRACT - Make required and clean up
      console.log('\n🧹 PHASE 3: CONTRACT')
      const contractMigration = new AddUserPreferencesContractMigration()
      await contractMigration.execute()

      // Enable final feature flag
      await featureFlags.enableFlag('user_preferences_contract')
      console.log('✅ Contract phase completed - column now required')

      console.log('\n🎉 Zero-downtime migration completed successfully!')
      console.log('📝 Next steps:')
      console.log('   - Deploy application code using new schema')
      console.log('   - Remove old preference handling logic')
      console.log('   - Update client applications')

    } catch (error) {
      console.error('❌ Migration failed:', error)
      await this.rollbackMigration()
      throw error
    }
  }

  /**
   * Rollback to previous state
   */
  async rollbackMigration(): Promise<void> {
    console.log('⏪ Rolling back migration...')

    try {
      // Rollback contract phase
      if (featureFlags.isEnabled('user_preferences_contract')) {
        const contractMigration = new AddUserPreferencesContractMigration()
        await contractMigration.rollback()
        await featureFlags.rollbackFlag('user_preferences_contract')
      }

      // Rollback expand phase
      if (featureFlags.isEnabled('user_preferences_expand')) {
        const expandMigration = new AddUserPreferencesExpandMigration()
        await expandMigration.rollback()
        await featureFlags.rollbackFlag('user_preferences_expand')
      }

      console.log('✅ Migration rolled back successfully')
      console.log('📝 Rollback complete - redeploy previous application binary')

    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError)
      throw rollbackError
    }
  }

  /**
   * Monitor migration progress
   */
  async getMigrationStatus(): Promise<any> {
    const backfillProgress = await this.backfillService.getBackfillProgress()

    return {
      expandEnabled: featureFlags.isEnabled('user_preferences_expand'),
      contractEnabled: featureFlags.isEnabled('user_preferences_contract'),
      backfillProgress,
      featureFlags: featureFlags.getAllFlags()
    }
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

export async function demonstrateZeroDowntimeMigration(): Promise<void> {
  const orchestrator = new ZeroDowntimeMigrationOrchestrator(prisma)
  const userService = new UserService(prisma)

  // Execute the complete migration
  await orchestrator.executeZeroDowntimeMigration()

  // Monitor progress
  const status = await orchestrator.getMigrationStatus()
  console.log('Migration Status:', status)

  // Use the new functionality
  const userId = 'example-user-id'
  const preferences = await userService.getUserPreferences(userId)
  console.log('User preferences:', preferences)

  // Update preferences
  await userService.updateUserPreferences(userId, {
    ...preferences,
    theme: 'dark'
  })
}

// Export for use in migration scripts
export const zeroDowntimeMigration = new ZeroDowntimeMigrationOrchestrator(prisma)
export const backfillService = new DataBackfillService(prisma)
