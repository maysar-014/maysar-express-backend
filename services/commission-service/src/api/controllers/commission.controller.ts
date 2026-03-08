/**
 * Commission Controller
 * API layer for commission operations
 */

import { Request, Response } from 'express';
import { CalculateCommissionUseCase, CalculateCommissionInput } from '../../application/use-cases/calculate-commission.use-case';
import { ApproveCommissionUseCase, ApproveCommissionInput } from '../../application/use-cases/approve-commission.use-case';
import { ICommissionRepository, IEventStoreRepository, IPayoutRepository } from '../../domain/repositories/index';
import { CommissionId, OrderId, SellerId } from '../../domain/value-objects/ids.value-object';
import { CommissionAmount, CommissionRate } from '../../domain/value-objects/monetary.value-object';
import { CommissionType } from '../../domain/value-objects/commission-types.value-object';
import { RecipientType } from '../../domain/value-objects/recipient-types.value-object';

export class CommissionController {
  constructor(
    private calculateCommissionUseCase: CalculateCommissionUseCase,
    private approveCommissionUseCase: ApproveCommissionUseCase,
    private commissionRepository: ICommissionRepository
  ) {}

  /**
   * Calculate commission for an order
   */
  async calculateCommission(req: Request, res: Response): Promise<void> {
    try {
      const input: CalculateCommissionInput = {
        orderId: OrderId.fromString(req.body.orderId),
        sellerId: SellerId.fromString(req.body.sellerId),
        orderAmount: CommissionAmount.fromNumber(req.body.orderAmount),
        recipientType: req.body.recipientType as RecipientType,
        commissionType: req.body.commissionType as CommissionType,
        baseRate: req.body.baseRate ? CommissionRate.fromDecimal(req.body.baseRate) : undefined,
        performanceBonus: req.body.performanceBonus,
        qualityMetrics: req.body.qualityMetrics,
        specialConditions: req.body.specialConditions
      };

      const result = await this.calculateCommissionUseCase.execute(input);

      res.status(201).json({
        success: true,
        data: {
          commissionId: result.commission.id.toString(),
          amount: result.commission.amount.toNumber(),
          breakdown: {
            baseAmount: result.breakdown.baseAmount.toNumber(),
            bonus: result.breakdown.bonus.toNumber(),
            totalCommission: result.breakdown.totalCommission.toNumber(),
            appliedRate: result.breakdown.appliedRate.toNumber()
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Approve a commission
   */
  async approveCommission(req: Request, res: Response): Promise<void> {
    try {
      const input: ApproveCommissionInput = {
        commissionId: CommissionId.fromString(req.params.id),
        approverRole: req.user?.roles?.[0] || 'user',
        approverId: req.user?.userId || 'system',
        autoSchedulePayout: req.body.autoSchedulePayout
      };

      const result = await this.approveCommissionUseCase.execute(input);

      res.json({
        success: true,
        data: {
          approved: true,
          eventsGenerated: result.events.length
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get commission by ID
   */
  async getCommission(req: Request, res: Response): Promise<void> {
    try {
      const commissionId = CommissionId.fromString(req.params.id);
      const commission = await this.commissionRepository.findById(commissionId);

      if (!commission) {
        res.status(404).json({
          success: false,
          error: 'Commission not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: commission.id.toString(),
          orderId: commission.orderId.toString(),
          sellerId: commission.sellerId.toString(),
          amount: commission.amount.toNumber(),
          rate: commission.rate.toNumber(),
          type: commission.type,
          status: commission.status,
          createdAt: commission.createdAt,
          paidAt: commission.paidAt,
          payoutId: commission.payoutId
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get commissions for a seller
   */
  async getSellerCommissions(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = SellerId.fromString(req.params.sellerId);
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      let commissions;
      if (status) {
        commissions = await this.commissionRepository.findByStatus(status as any);
        commissions = commissions.filter(c => c.sellerId.equals(sellerId));
      } else {
        commissions = await this.commissionRepository.findBySellerId(sellerId);
      }

      // Apply pagination
      const paginatedCommissions = commissions.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          commissions: paginatedCommissions.map(c => ({
            id: c.id.toString(),
            orderId: c.orderId.toString(),
            amount: c.amount.toNumber(),
            rate: c.rate.toNumber(),
            type: c.type,
            status: c.status,
            createdAt: c.createdAt,
            paidAt: c.paidAt
          })),
          total: commissions.length,
          limit,
          offset
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get commission summary for a seller
   */
  async getCommissionSummary(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = SellerId.fromString(req.params.sellerId);
      const summary = await this.commissionRepository.getCommissionSummary(sellerId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
