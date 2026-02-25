export class MarketContext {
    constructor(
        public readonly marketAveragePrice?: number,
        public readonly competitorPrices?: number[],
        public readonly demandLevel?: 'low' | 'medium' | 'high',
        public readonly salesVelocity?: number
    ) {}

    isAvailable(): boolean {
        return this.marketAveragePrice !== undefined && this.marketAveragePrice > 0;
    }

    getAverageCompetitorPrice(): number | null {
        if (!this.competitorPrices || this.competitorPrices.length === 0) return null;
        return this.competitorPrices.reduce((a, b) => a + b, 0) / this.competitorPrices.length;
    }
}
