import { injectable } from 'inversify';

@injectable()
export class CategoryGuardService {
    private readonly CATEGORY_CAPS: Record<string, number> = {
        electronics: 3,
        fashion: 5,
        food: 4,
        default: 4
    };

    enforce(price: number, baseCost: number, category: string): { price: number; adjustments: string[] } {
        const adjustments: string[] = [];
        const cap = this.CATEGORY_CAPS[category.toLowerCase()] ?? this.CATEGORY_CAPS.default;
        const maxPrice = baseCost * cap;

        if (price > maxPrice) {
            adjustments.push(`Category cap applied: ${category} limited to ${cap}x base cost (${maxPrice} TZS)`);
            return { price: maxPrice, adjustments };
        }

        return { price, adjustments };
    }
}
