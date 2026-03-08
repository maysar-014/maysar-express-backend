// @ts-nocheck
import { NormalizationAlgorithm } from '../algorithms/normalization.algorithm';

export interface ProductIdentifiersProps {
    gtin?: string;
    mpn?: string;
    isbn?: string;
}

export class ProductIdentifiers {
    public readonly gtin?: string;
    public readonly mpn?: string;
    public readonly isbn?: string;

    constructor(props: ProductIdentifiersProps) {
        this.gtin = props.gtin ? NormalizationAlgorithm.normalizeIdentifier(props.gtin, 'GTIN') : undefined;
        this.mpn = props.mpn ? NormalizationAlgorithm.normalizeIdentifier(props.mpn, 'MPN') : undefined;
        this.isbn = props.isbn ? NormalizationAlgorithm.normalizeIdentifier(props.isbn, 'ISBN') : undefined;

        this.validate();
    }

    private validate(): void {
        // Basic format validation could happen here if not fully handled by normalization
    }

    hasAnyIdentifier(): boolean {
        return !!(this.gtin || this.mpn || this.isbn);
    }

    equals(other: ProductIdentifiers): boolean {
        if (this.gtin && other.gtin && this.gtin === other.gtin) return true;
        if (this.mpn && other.mpn && this.mpn === other.mpn) return true;
        if (this.isbn && other.isbn && this.isbn === other.isbn) return true;
        return false;
    }

    toString(): string {
        const parts = [];
        if (this.gtin) parts.push(`GTIN:${this.gtin}`);
        if (this.mpn) parts.push(`MPN:${this.mpn}`);
        if (this.isbn) parts.push(`ISBN:${this.isbn}`);
        return parts.join(', ');
    }
}
