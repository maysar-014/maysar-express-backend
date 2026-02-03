import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

export const setupTestContainer = async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('analytics_test_db')
        .withUsername('test_user')
        .withPassword('test_password')
        .start();

    const databaseUrl = container.getConnectionUri();

    // Run migrations
    execSync(`npx prisma migrate deploy`, {
        env: {
            ...process.env,
            DATABASE_URL: databaseUrl
        }
    });

    prisma = new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl
            }
        }
    });

    return prisma;
};

export const teardownTestContainer = async () => {
    if (prisma) {
        await prisma.$disconnect();
    }
    if (container) {
        await container.stop();
    }
};

export const getTestPrisma = () => prisma;
