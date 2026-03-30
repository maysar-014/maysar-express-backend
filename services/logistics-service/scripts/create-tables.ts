import { execSync } from 'child_process';
import path from 'path';

type MigrationMode = 'deploy' | 'dev';

const resolveSchemaPath = (): string => {
  if (process.env.PRISMA_SCHEMA_PATH) {
    return process.env.PRISMA_SCHEMA_PATH;
  }

  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  return path.join(repoRoot, 'prisma', 'schema.prisma');
};

const resolveMigrationMode = (): MigrationMode => {
  const mode = process.env.MIGRATION_MODE?.toLowerCase();
  if (mode === 'dev' || mode === 'deploy') {
    return mode;
  }

  return process.env.NODE_ENV === 'production' ? 'deploy' : 'deploy';
};

const runPrismaMigrations = (): void => {
  const schemaPath = resolveSchemaPath();
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const mode = resolveMigrationMode();
  const migrateCommand =
    mode === 'dev'
      ? `npx prisma migrate dev --schema "${schemaPath}"`
      : `npx prisma migrate deploy --schema "${schemaPath}"`;

  execSync(migrateCommand, { stdio: 'inherit', cwd: repoRoot });
  execSync(`npx prisma generate --schema "${schemaPath}"`, { stdio: 'inherit', cwd: repoRoot });
  process.stdout.write('Prisma migrations applied for logistics service\n');
};

try {
  runPrismaMigrations();
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
}
