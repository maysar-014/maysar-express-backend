#!/usr/bin/env node

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { supabaseAdmin } from '../shared/supabase/client';

interface Migration {
  id: string;
  name: string;
  sql: string;
  applied_at?: string;
}

class MigrationRunner {
  private migrationsPath = join(__dirname, '../database/supabase/migrations');
  private seedsPath = join(__dirname, '../database/supabase/seeds');

  async createMigrationsTable() {
    const { error } = await supabaseAdmin.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (error) {
      console.error('Error creating migrations table:', error);
      throw error;
    }
  }

  async getAppliedMigrations(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('migrations')
      .select('id')
      .order('applied_at');

    if (error) {
      console.error('Error fetching applied migrations:', error);
      return [];
    }

    return data.map(m => m.id);
  }

  async getMigrationFiles(): Promise<Migration[]> {
    const files = readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(file => {
      const id = file.replace('.sql', '');
      const sql = readFileSync(join(this.migrationsPath, file), 'utf8');
      return { id, name: file, sql };
    });
  }

  async runMigration(migration: Migration) {
    console.log(`Running migration: ${migration.name}`);
    
    try {
      // Execute the migration SQL
      const { error } = await supabaseAdmin.rpc('exec', {
        sql: migration.sql
      });

      if (error) {
        console.error(`Error running migration ${migration.name}:`, error);
        throw error;
      }

      // Record the migration as applied
      const { error: insertError } = await supabaseAdmin
        .from('migrations')
        .insert({
          id: migration.id,
          name: migration.name
        });

      if (insertError) {
        console.error(`Error recording migration ${migration.name}:`, insertError);
        throw insertError;
      }

      console.log(`✅ Migration ${migration.name} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migration.name} failed:`, error);
      throw error;
    }
  }

  async runMigrations() {
    console.log('🚀 Starting database migrations...');

    try {
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();

      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      console.log(`Found ${appliedMigrations.length} applied migrations`);

      // Get all migration files
      const migrationFiles = await this.getMigrationFiles();
      console.log(`Found ${migrationFiles.length} migration files`);

      // Filter out already applied migrations
      const pendingMigrations = migrationFiles.filter(
        migration => !appliedMigrations.includes(migration.id)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations to run');
        return;
      }

      console.log(`Running ${pendingMigrations.length} pending migrations...`);

      // Run each pending migration
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }

      console.log('🎉 All migrations completed successfully!');
    } catch (error) {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    }
  }

  async runSeeds() {
    console.log('🌱 Running database seeds...');

    try {
      const seedFiles = readdirSync(this.seedsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of seedFiles) {
        console.log(`Running seed: ${file}`);
        const sql = readFileSync(join(this.seedsPath, file), 'utf8');
        
        const { error } = await supabaseAdmin.rpc('exec', {
          sql
        });

        if (error) {
          console.error(`Error running seed ${file}:`, error);
          throw error;
        }

        console.log(`✅ Seed ${file} completed successfully`);
      }

      console.log('🎉 All seeds completed successfully!');
    } catch (error) {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    }
  }

  async reset() {
    console.log('🔄 Resetting database...');
    
    try {
      // Drop all tables (be careful!)
      const { error } = await supabaseAdmin.rpc('exec', {
        sql: `
          DROP SCHEMA public CASCADE;
          CREATE SCHEMA public;
          GRANT ALL ON SCHEMA public TO postgres;
          GRANT ALL ON SCHEMA public TO public;
        `
      });

      if (error) {
        console.error('Error resetting database:', error);
        throw error;
      }

      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('💥 Database reset failed:', error);
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      await runner.runMigrations();
      break;
    case 'seed':
      await runner.runSeeds();
      break;
    case 'reset':
      await runner.reset();
      break;
    case 'fresh':
      await runner.reset();
      await runner.runMigrations();
      await runner.runSeeds();
      break;
    default:
      console.log(`
Usage: npm run db:migrate [command]

Commands:
  migrate  Run pending migrations
  seed     Run database seeds
  reset    Reset database (drops all tables)
  fresh    Reset database and run migrations + seeds

Examples:
  npm run db:migrate migrate
  npm run db:migrate seed
  npm run db:migrate fresh
      `);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MigrationRunner };