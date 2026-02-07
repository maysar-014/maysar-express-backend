import { Request, Response } from 'express';
import { ListProductUseCase } from '../../application/use-cases/list-product.use-case';

export class ProductListingController {
    constructor(
        private readonly listProductUseCase: ListProductUseCase,
        private readonly listingRepository: any
    ) { }

    async listProduct(req: Request, res: Response): Promise<void> {
        try {
            const { enablerId } = req.params;
            const dto = req.body;
            const result = await this.listProductUseCase.execute(enablerId, dto);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async getListings(req: Request, res: Response): Promise<void> {
        try {
            const { enablerId } = req.params;
            const listings = await this.listingRepository.findByEnablerId(enablerId);
            res.status(200).json(listings.map((l: any) => l.toPlainObject()));
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getHubProducts(req: Request, res: Response): Promise<void> {
        try {
            // Mock implementation for Browse Hub
            // In real scenario, would use BrowseEnablerHubUseCase
            res.status(200).json({ message: 'Hub products endpoint' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
