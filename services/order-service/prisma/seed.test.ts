import { readFileSync } from 'fs';
import path from 'path';

describe('seed scripts definitions', () => {
  it('order-service seed contains expected fixture sections', () => {
    const filePath = path.resolve(__dirname, './seed.ts');
    const contents = readFileSync(filePath, 'utf8');

    expect(contents).toContain('Starting database seeding');
    expect(contents).toContain('sampleOrders');
    expect(contents).toContain('samplePayments');
    expect(contents).toContain('sampleSettlements');
    expect(contents).toContain('prisma.$disconnect()');
  });

  it('training-service seed contains module and certification upserts', () => {
    const filePath = path.resolve(__dirname, '../../training-service/prisma/seed.ts');
    const contents = readFileSync(filePath, 'utf8');

    expect(contents).toContain('trainingModule.upsert');
    expect(contents).toContain('certificationRequirement.upsert');
    expect(contents).toContain('Seed data created successfully');
    expect(contents).toContain('prisma.$disconnect()');
  });
});
