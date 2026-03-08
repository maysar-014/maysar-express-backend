// @ts-nocheck
import { IBuyBoxRepository } from '../../domain/repositories/repository.interfaces';
import { BuyBoxEngine } from '../../domain/engines/buy-box.engine';
import { BuyBoxWeights } from '../../domain/value-objects/buy-box-weights.value-object';
import { BuyBoxEventPublisher } from '../../infrastructure/messaging/buy-box-event-publisher';
import { BuyBoxComputedEvent } from '../../domain/events/buy-box-events';
import { ComputeBuyBoxRequestDto, BuyBoxResponseDto } from '../dto/buy-box-dto';

export class ComputeBuyBoxUseCase {
  constructor(
    private readonly buyBoxRepository: IBuyBoxRepository,
    private readonly eventPublisher: BuyBoxEventPublisher,
    private readonly weights: BuyBoxWeights
  ) {}

  async execute(request: ComputeBuyBoxRequestDto): Promise<BuyBoxResponseDto> {
    const result = BuyBoxEngine.compute(request.productId, request.listings, this.weights);

    if (!result) {
      console.warn(`No eligible sellers for product ${request.productId}`);
      return {
        productId: request.productId,
        primarySellerId: null,
        primaryScore: null,
        alternatives: [],
        lastComputedAt: new Date()
      };
    }

    await this.buyBoxRepository.save(result);

    const event = new BuyBoxComputedEvent(
      result.productId,
      result.primarySellerId,
      result.primaryScore,
      result.alternatives.length,
      result.computedAt
    );
    await this.eventPublisher.publishComputed(event);

    return {
      productId: result.productId,
      primarySellerId: result.primarySellerId,
      primaryScore: result.primaryScore,
      alternatives: result.alternatives,
      lastComputedAt: result.computedAt
    };
  }
}
