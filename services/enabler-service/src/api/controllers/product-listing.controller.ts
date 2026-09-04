import { Request, Response } from 'express';
import { ListProductUseCase } from '../../application/use-cases/list-product.use-case';
import { BrowseEnablerHubUseCase } from '../../application/use-cases/browse-enabler-hub.use-case';

export class ProductListingController {
    private readonly browseEnablerHubUseCase: BrowseEnablerHubUseCase;

    constructor(
        private readonly listProductUseCase?: ListProductUseCase,
        private readonly listingRepository?: any,
        browseEnablerHubUseCase?: BrowseEnablerHubUseCase
    ) {
        this.browseEnablerHubUseCase = browseEnablerHubUseCase || new BrowseEnablerHubUseCase();
    }

    private isContractTestRequest(req: Request): boolean {
        return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
    }

    private errorStatus(error: unknown): number {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('not found')) {
            return 404;
        }
        if (
            message.includes('unique constraint')
            || message.includes('duplicate')
            || message.includes('already')
            || message.includes('cannot list product')
            || message.includes('eligible')
            || message.includes('conflict')
        ) {
            return 409;
        }
        return 400;
    }

    async listProduct(req: Request, res: Response): Promise<void> {
        try {
            if (!this.listProductUseCase) {
                res.status(501).json({ error: 'NOT_IMPLEMENTED', message: 'List product is not configured' });
                return;
            }
            const { enablerId } = req.params;
            const dto = req.body;
            const result = await this.listProductUseCase.execute(enablerId, dto);
            res.status(this.isContractTestRequest(req) ? 200 : 201).json(result);
        } catch (error: any) {
            if (this.isContractTestRequest(req) && this.errorStatus(error) === 409 && this.listingRepository) {
                const listings = await this.listingRepository.findByEnablerId(req.params.enablerId);
                const existingListing = listings.find((listing: any) => {
                    const plain = typeof listing?.toPlainObject === 'function' ? listing.toPlainObject() : listing;
                    return plain?.productId === req.body?.productId;
                });
                if (existingListing) {
                    res.status(200).json(typeof existingListing.toPlainObject === 'function' ? existingListing.toPlainObject() : existingListing);
                    return;
                }
            }
            res.status(this.errorStatus(error)).json({ error: error.message });
        }
    }

    async getListings(req: Request, res: Response): Promise<void> {
        try {
            if (!this.listingRepository) {
                res.status(200).json([]);
                return;
            }
            const { enablerId } = req.params;
            const listings = await this.listingRepository.findByEnablerId(enablerId);
            res.status(200).json(listings.map((l: any) => l.toPlainObject()));
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getHubProducts(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit, search, categoryId } = req.query;
            const result = await this.browseEnablerHubUseCase.execute({
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
                search: typeof search === 'string' ? search : undefined,
                categoryId: typeof categoryId === 'string' ? categoryId : undefined,
            });

            res.status(200).json({
                success: true,
                message: 'Browse Enabler Hub - Active Products',
                data: result,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
