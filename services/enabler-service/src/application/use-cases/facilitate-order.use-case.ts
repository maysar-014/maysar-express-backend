import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { IEnablerOrderRepository } from '../../domain/repositories/enabler-order.repository.interface';
import { IProductListingRepository } from '../../domain/repositories/product-listing.repository.interface';
import { FacilitateOrderDto, EnablerOrderResponseDto } from '../dto/enabler-order.dto';
import { OrderFacilitationPolicy } from '../../domain/policies/order-facilitation.policy';
import { EnablerOrderEntity } from '../../domain/entities/enabler-order.entity';
import { OrderFacilitatedEvent } from '../../domain/events/enabler-events';
import { Enabler_OrderStatus, Enabler_Status } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class FacilitateOrderUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly orderRepository: IEnablerOrderRepository,
        private readonly listingRepository: IProductListingRepository,
        private readonly inventoryService: any,
        private readonly orderService: any,
        private readonly eventPublisher: any
    ) { }

    async execute(dto: FacilitateOrderDto): Promise<EnablerOrderResponseDto> {
        // 1. Fetch Enabler & Listing
        const enabler = await this.enablerRepository.findById(dto.enablerId);
        if (!enabler) throw new Error('Enabler not found');

        const listing = await this.listingRepository.findById(dto.listingId);
        if (!listing) throw new Error('Product listing not found');

        // 2. Check Inventory
        const inventoryAvailable = await this.inventoryService.checkAvailability(listing.productId, dto.quantity);

        // 3. Apply Policy
        const policyCheck = OrderFacilitationPolicy.canFacilitateOrder({
            enablerStatus: enabler.status,
            listingStatus: listing.toPlainObject().status,
            inventoryAvailable,
            buyerId: dto.buyerId,
            sellerId: listing.sellerId,
            enablerId: enabler.id
        });

        if (!policyCheck.allowed) {
            throw new Error(`Cannot facilitate order: ${policyCheck.reason}`);
        }

        // 4. Reserve Inventory
        await this.inventoryService.reserve(listing.productId, dto.quantity);

        // 5. Create Order in Order Service
        const orderDetails = await this.orderService.createOrder({
            buyerId: dto.buyerId,
            items: [{ productId: listing.productId, quantity: dto.quantity, price: listing.customPrice }],
            shippingAddressId: dto.shippingAddressId,
            billingAddressId: dto.billingAddressId
        });

        // 6. Calculate Commission (Simplified for initial creation)
        const commissionRate = enabler.calculateCommissionRate(orderDetails.totalAmount);
        const commissionAmount = orderDetails.totalAmount * commissionRate;

        // 7. Create Enabler Order Entity
        const enablerOrder = EnablerOrderEntity.create({
            id: uuidv4(),
            enablerId: dto.enablerId,
            orderId: orderDetails.id,
            sellerId: listing.sellerId,
            buyerId: dto.buyerId,
            productListingId: dto.listingId,
            status: Enabler_OrderStatus.PENDING,
            orderAmount: orderDetails.totalAmount,
            productAmount: orderDetails.totalAmount - commissionAmount, // Simplified
            enablerCommission: commissionAmount,
            platformFee: 0, // Calculated later
            commissionRate,
            tierBonus: 0,
            performanceBonus: 0,
            settlementStatus: 'pending',
            disputeStatus: 'none',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // 8. Save Order record
        await this.orderRepository.save(enablerOrder);

        // 9. Publish Event
        await this.eventPublisher.publish(new OrderFacilitatedEvent(
            orderDetails.id,
            dto.enablerId,
            orderDetails.totalAmount
        ));

        return {
            id: enablerOrder.id,
            orderId: enablerOrder.orderId,
            enablerId: enablerOrder.enablerId,
            status: enablerOrder.status,
            orderAmount: enablerOrder.orderAmount,
            enablerCommission: enablerOrder.enablerCommission,
            settlementStatus: enablerOrder.settlementStatus,
            createdAt: new Date()
        };
    }
}
