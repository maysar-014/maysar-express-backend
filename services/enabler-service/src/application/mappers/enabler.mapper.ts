import { EnablerEntity } from '../../domain/entities/enabler.entity';
import { EnablerResponseDto, EnablerAnalyticsDto } from '../dto/enabler-registration.dto';

export class EnablerMapper {
    static toResponseDto(enabler: EnablerEntity): EnablerResponseDto {
        return {
            id: enabler.id,
            userId: enabler.userId,
            businessName: enabler.businessName,
            status: enabler.status,
            tier: enabler.tier,
            verificationStatus: enabler.toPlainObject().verificationStatus,
            commissionRate: enabler.commissionRate,
            createdAt: enabler.toPlainObject().createdAt,
        };
    }

    static toAnalyticsDto(enabler: EnablerEntity): EnablerAnalyticsDto {
        return {
            totalSales: enabler.totalSales,
            totalOrders: enabler.totalOrders,
            conversionRate: enabler.conversionRate,
            customerRating: enabler.toPlainObject().customerRating || undefined,
            totalCommissionEarned: enabler.toPlainObject().totalCommissionEarned,
            tier: enabler.tier,
        };
    }
}
