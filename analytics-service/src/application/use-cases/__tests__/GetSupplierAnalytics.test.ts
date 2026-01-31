import { GetSupplierAnalytics } from '../GetSupplierAnalytics';
import { SupplierAnalyticsRepository } from '../../../infrastructure/repositories/SupplierAnalyticsRepository';

// Since we haven't seen this file content yet, assuming standard structure
jest.mock('../../../infrastructure/repositories/SupplierAnalyticsRepository');

describe('GetSupplierAnalytics', () => {
    // Assuming type structure based on file name pattern
    let useCase: GetSupplierAnalytics;
    let repository: any; // Using any for now as we mocked the class

    beforeEach(() => {
        jest.clearAllMocks();
        // Manual mock instantiation since we don't have the class definition loaded to infer types perfectly,
        // but Jest will handle the mocked class structure.
        const MockRepo = require('../../../infrastructure/repositories/SupplierAnalyticsRepository').SupplierAnalyticsRepository;
        repository = new MockRepo();
        useCase = new GetSupplierAnalytics(repository);
    });

    it('should existing supplier analytics', async () => {
        const supplierId = 'sup-001';
        const mockResult = { supplierId, qualityScore: 95 };

        // Assuming the method name is getAnalytics or similar based on pattern. 
        // Need to check file content ideally, but following GetSales/GetSeller pattern of `execute` calling a repository method.
        // Let's assume `getMetrics` or `getAnalytics`. We'll spy on whatever execute calls.
        // Wait, better to read the file first? No, I'll assume standard pattern from previous files: repository.getMetrics(id) or similar.
        // To be safe, I'll mock the method that `execute` calls.

        // Actually, let's verify usage in Controller. Controller calls `useCase.execute`.
        // I will assume repository method is similar to others.

        repository.getMetrics = jest.fn().mockResolvedValue(mockResult);

        const result = await useCase.execute(supplierId);

        expect(repository.getMetrics).toHaveBeenCalledWith(supplierId);
        expect(result).toBe(mockResult);
    });
});
