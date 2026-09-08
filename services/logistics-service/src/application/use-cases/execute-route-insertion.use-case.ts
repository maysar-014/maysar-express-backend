/**
 * ExecuteRouteInsertionUseCase (Phase 5 §5.2)
 *
 * Handles the driver-app event RouteExtensionAccepted: extends the
 * DeliveryJob's route with the inserted shipment, rebinds the shipment to the
 * job, and issues an updated FulfillmentCommitment to the new shipment's
 * buyer — priced at the MARGINAL cost of the insertion, never the full route
 * cost (backlog §5.2).
 */

import { ShipmentRepository } from '../../domain/repositories/shipment.repository';
import { DeliveryJobRepository } from '../../domain/repositories/delivery-job.repository';
import { RouteInsertionCandidateRepository } from '../../domain/repositories/phase5.repository';
import { FulfillmentCommitmentRepository } from '../../domain/repositories/cost-model.repository';
import { FulfillmentCommitment } from '../../domain/entities/fulfillment-commitment.entity';
import { makeId } from '../../../../../shared/ids/id';

export interface ExecuteInsertionResult {
  deliveryJobId: string;
  shipmentId: string;
  jobShipmentIds: string[];
  buyerPriceTzs: number;
  commitmentId: string;
}

export class ExecuteRouteInsertionUseCase {
  constructor(
    private readonly shipmentRepo: ShipmentRepository,
    private readonly jobRepo: DeliveryJobRepository,
    private readonly candidateRepo: RouteInsertionCandidateRepository,
    private readonly commitmentRepo: FulfillmentCommitmentRepository,
  ) {}

  async execute(params: {
    shipmentId: string;
    deliveryJobId: string;
    /** Buyer-facing checkout session for the inserted shipment's order. */
    checkoutSessionId: string;
    /** Quote already issued to this buyer for the insertion. */
    quoteId: string;
    pricingVersion: number;
    /** Commitment validity (defaults to 24h). */
    validitySeconds?: number;
  }): Promise<ExecuteInsertionResult> {
    const shipment = await this.shipmentRepo.findById(params.shipmentId);
    if (!shipment) throw new Error(`Shipment ${params.shipmentId} not found`);
    const job = await this.jobRepo.findById(params.deliveryJobId);
    if (!job) throw new Error(`DeliveryJob ${params.deliveryJobId} not found`);

    // Only a previously evaluated, feasible candidate may be executed.
    const candidates = await this.candidateRepo.findByDeliveryJobId(params.deliveryJobId);
    const candidate = candidates.find(c => c.shipmentId === params.shipmentId);
    if (!candidate || !candidate.feasible) {
      throw new Error(
        `Route insertion rejected: no feasible evaluated candidate for shipment ${params.shipmentId} on job ${params.deliveryJobId}`,
      );
    }

    // 1. Extend the job (named transition; throws on terminal states / dupes).
    job.extendWithShipment(params.shipmentId);
    await this.jobRepo.save(job);

    // 2. Bind the shipment to the job.
    shipment.assignToJob(params.deliveryJobId);
    await this.shipmentRepo.save(shipment);

    // 3. Price lock for the new buyer at the marginal cost — never the full
    //    route cost. Lock is absolute (backlog rule 6).
    const buyerPriceTzs = candidate.marginalCostTzs;
    const commitment = FulfillmentCommitment.create({
      id: makeId('flc'),
      checkoutSessionId: params.checkoutSessionId,
      quoteId: params.quoteId,
      buyerPriceTzs,
      pricingVersion: params.pricingVersion,
      expiresAt: new Date(Date.now() + (params.validitySeconds ?? 86_400) * 1000),
    });
    await this.commitmentRepo.save(commitment);

    return {
      deliveryJobId: job.id,
      shipmentId: params.shipmentId,
      jobShipmentIds: job.shipmentIds,
      buyerPriceTzs,
      commitmentId: commitment.id,
    };
  }
}
