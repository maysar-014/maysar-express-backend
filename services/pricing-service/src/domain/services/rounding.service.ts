import { injectable } from 'inversify';

@injectable()
export class RoundingService {
    round(price: number): number {
        if (price < 100_000) {
            return Math.round(price / 500) * 500;
        }
        return Math.round(price / 1000) * 1000;
    }

    describeRounding(price: number): string {
        const rounded = this.round(price);
        const increment = price < 100_000 ? 500 : 1000;
        return `Rounded to nearest ${increment} TZS: ${price.toFixed(0)} → ${rounded}`;
    }
}
