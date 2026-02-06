import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Seed Training Modules
    const safetyModule = await prisma.trainingModule.upsert({
        where: { id: 'safety-basics' },
        update: {},
        create: {
            id: 'safety-basics',
            name: 'Safety Basics',
            description: 'Fundamental safety protocols for delivery',
            content: 'Detailed safety content...',
            durationMinutes: 60,
            category: 'Safety',
            prerequisites: [],
            targetRoles: ['courier'],
            isPublic: true,
            difficulty: 'BEGINNER'
        }
    });

    const customerServiceModule = await prisma.trainingModule.upsert({
        where: { id: 'customer-service' },
        update: {},
        create: {
            id: 'customer-service',
            name: 'Customer Service',
            description: 'How to interact with customers',
            content: 'detailed customer service content...',
            durationMinutes: 45,
            category: 'Service',
            prerequisites: [],
            targetRoles: [],
            isPublic: true,
            difficulty: 'BEGINNER'
        }
    });

    // Seed Certification Requirements
    await prisma.certificationRequirement.upsert({
        where: { module: 'safety-basics' },
        update: {},
        create: {
            module: 'safety-basics',
            minimumScore: 80,
            validityPeriodDays: 365,
            mandatory: true,
            maxAttempts: 3
        }
    });

    await prisma.certificationRequirement.upsert({
        where: { module: 'customer-service' },
        update: {},
        create: {
            module: 'customer-service',
            minimumScore: 75,
            validityPeriodDays: 180,
            mandatory: true,
            maxAttempts: 3
        }
    });

    console.log('Seed data created successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
