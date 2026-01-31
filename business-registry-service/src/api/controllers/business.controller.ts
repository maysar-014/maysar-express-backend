import { Request, Response } from 'express';
import { RegisterBusinessUseCase } from '../../application/use-cases/register-business.use-case';
import { VerifyBusinessUseCase } from '../../application/use-cases/verify-business.use-case';
import { UpdateBusinessUseCase } from '../../application/use-cases/update-business.use-case';
import { SuspendBusinessUseCase } from '../../application/use-cases/suspend-business.use-case';
import { ReactivateBusinessUseCase } from '../../application/use-cases/reactivate-business.use-case';
import { BusinessMapper } from '../../application/mappers/business-mapper';
import { IBusinessRepository } from '../../domain/repositories';
import { BusinessNotFoundError } from '../../domain/errors/business.errors';

export class BusinessController {
  constructor(
    private readonly registerBusinessUseCase: RegisterBusinessUseCase,
    private readonly verifyBusinessUseCase: VerifyBusinessUseCase,
    private readonly updateBusinessUseCase: UpdateBusinessUseCase,
    private readonly suspendBusinessUseCase: SuspendBusinessUseCase,
    private readonly reactivateBusinessUseCase: ReactivateBusinessUseCase,
    private readonly businessRepository: IBusinessRepository
  ) {}

  async registerBusiness(req: Request, res: Response): Promise<void> {
    try {
      const dto = req.body;
      const business = await this.registerBusinessUseCase.execute(dto);
      res.status(201).json({
        success: true,
        data: BusinessMapper.toResponseDto(business),
        message: 'Business registered successfully'
      });
    } catch (error) {
      throw error;
    }
  }

  async getBusinessById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const business = await this.businessRepository.findById(id);
      if (!business) {
        throw new BusinessNotFoundError('Business not found');
      }
      res.status(200).json({
        success: true,
        data: BusinessMapper.toResponseDto(business)
      });
    } catch (error) {
      throw error;
    }
  }

  async updateBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto = req.body;
      const updatedBy = (req.headers['x-user-id'] as string) || id;
      const business = await this.updateBusinessUseCase.execute(id, dto, updatedBy);
      res.status(200).json({
        success: true,
        data: BusinessMapper.toResponseDto(business),
        message: 'Business updated successfully'
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const business = await this.businessRepository.findById(id);
      if (!business) {
        throw new BusinessNotFoundError('Business not found');
      }
      await this.businessRepository.delete(id);
      res.status(200).json({
        success: true,
        message: 'Business deleted successfully'
      });
    } catch (error) {
      throw error;
    }
  }

  async verifyBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { verifiedBy, documentTypes } = req.body;
      const business = await this.verifyBusinessUseCase.execute({
        businessId: id,
        verifiedBy,
        documentTypes
      });
      res.status(200).json({
        success: true,
        data: BusinessMapper.toResponseDto(business),
        message: 'Business verified successfully'
      });
    } catch (error) {
      throw error;
    }
  }

  async suspendBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { suspendedBy, reason } = req.body;
      const business = await this.suspendBusinessUseCase.execute({
        businessId: id,
        suspendedBy,
        reason
      });
      res.status(200).json({
        success: true,
        data: BusinessMapper.toResponseDto(business),
        message: 'Business suspended successfully'
      });
    } catch (error) {
      throw error;
    }
  }

  async reactivateBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const reactivatedBy = (req.headers['x-user-id'] as string) || req.body.reactivatedBy || id;
      const business = await this.reactivateBusinessUseCase.execute(id, reactivatedBy);
      res.status(200).json({
        success: true,
        data: BusinessMapper.toResponseDto(business),
        message: 'Business reactivated successfully'
      });
    } catch (error) {
      throw error;
    }
  }

  async getBusinessesByOwner(req: Request, res: Response): Promise<void> {
    try {
      const { ownerId } = req.params;
      const businesses = await this.businessRepository.findByOwnerId(ownerId);
      res.status(200).json({
        success: true,
        data: businesses.map(b => BusinessMapper.toResponseDto(b))
      });
    } catch (error) {
      throw error;
    }
  }

  async searchBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const businesses = await this.businessRepository.search(query, limit, offset);
      res.status(200).json({
        success: true,
        data: businesses.map(b => BusinessMapper.toResponseDto(b))
      });
    } catch (error) {
      throw error;
    }
  }
}
