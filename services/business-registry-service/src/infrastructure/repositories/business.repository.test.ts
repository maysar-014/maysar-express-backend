jest.mock('./prisma-business.repository', () => ({
  PrismaBusinessRepository: class PrismaBusinessRepositoryMock {}
}));

import { PrismaBusinessRepository } from './business.repository';

describe('business.repository re-export', () => {
  it('re-exports PrismaBusinessRepository implementation', () => {
    expect(PrismaBusinessRepository).toBeDefined();
    expect(typeof PrismaBusinessRepository).toBe('function');
  });
});
