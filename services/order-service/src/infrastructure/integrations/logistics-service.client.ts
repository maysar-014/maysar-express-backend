import { ILogisticsServiceClient } from '../../domain/engines/cod-eligibility.engine';

export class LogisticsServiceClient implements ILogisticsServiceClient {
    async isCODSupportedInArea(address: any): Promise<boolean> {
        console.log(`[LogisticsServiceClient] Checking COD support for address: ${JSON.stringify(address)}`);
        return true;
    }

    async isCrossRegionDelivery(address: any, sellerAddress: any): Promise<boolean> {
        console.log(`[LogisticsServiceClient] Checking cross-region delivery`);
        return false;
    }
}
