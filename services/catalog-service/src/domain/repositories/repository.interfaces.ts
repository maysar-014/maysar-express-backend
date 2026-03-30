import { Product } from '../entities/product.entity';
import { ProductIdentifiers } from '../value-objects/product-identifiers.value-object';

export interface IProductRepository {
    findById(id: string): Promise<Product | null>;
    findByIdentifiers(identifiers: ProductIdentifiers): Promise<Product[]>;
    findByFingerprint(fingerprint: string, categoryId: string): Promise<Product[]>;
    findByCategoryAndBrand(categoryId: string, brand: string): Promise<Product[]>;
    save(product: Product): Promise<void>;
}

export interface IProductMatchAuditRepository {
    save(audit: ProductMatchAudit): Promise<void>;
    findById(id: string): Promise<ProductMatchAudit | null>;
    findBySeller(sellerId: string, limit?: number): Promise<ProductMatchAudit[]>;
    findByMatchLevel(level: string): Promise<ProductMatchAudit[]>;
}

export interface IMatchConfirmationRepository {
    save(confirmation: MatchConfirmation): Promise<void>;
    findById(id: string): Promise<MatchConfirmation | null>;
    findPendingBySeller(sellerId: string): Promise<MatchConfirmation[]>;
    updateStatus(id: string, status: string, sellerChoice?: string): Promise<void>;
    findExpired(): Promise<MatchConfirmation[]>;
}

// Domain models for audit and confirmation (simplified for now)
export interface ProductMatchAudit {
    id: string;
    candidateProductId: string;
    matchedProductId?: string;
    matchLevel: string;
    matchScore: number;
    matchingCriteria: Record<string, unknown>;
    decision: string;
    decidedBy: string;
    sellerId: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export interface MatchConfirmation {
    id: string;
    auditId: string;
    sellerId: string;
    candidateProducts: unknown[];
    status: string;
    sellerChoice?: string;
    expiresAt: Date;
    respondedAt?: Date;
    createdAt: Date;
}
