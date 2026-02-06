import { NextFunction, Request, Response } from 'express';
import { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import { ILeaderboardRepository } from '../../domain/repositories/leaderboard.repository';
import { IBadgeRepository } from '../../domain/repositories/badge.repository';
import { TrainingModuleMapper } from '../../application/mappers/training-module.mapper';
import { NotFoundError } from '../../domain/errors/domain.error';

export class ModuleController {
    constructor(
        private readonly moduleRepo: ITrainingModuleRepository,
        private readonly leaderboardRepo: ILeaderboardRepository,
        private readonly badgeRepo: IBadgeRepository
    ) { }

    public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const modules = await this.moduleRepo.findAll();
            res.status(200).json(modules.map(m => TrainingModuleMapper.toDTO(m)));
        } catch (error) {
            next(error);
        }
    }

    public async get(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const module = await this.moduleRepo.findById(id);
            if (!module) {
                throw new NotFoundError('TrainingModule', id);
            }
            res.status(200).json(TrainingModuleMapper.toDTO(module));
        } catch (error) {
            next(error);
        }
    }

    public async getContent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const module = await this.moduleRepo.findById(id);
            if (!module) {
                throw new NotFoundError('TrainingModule', id);
            }
            res.status(200).json({
                contentType: module.contentType,
                content: module.content
            });
        } catch (error) {
            next(error);
        }
    }

    public async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { limit } = req.query;
            const entries = await this.leaderboardRepo.getTop(Number(limit) || 10);
            res.status(200).json(entries);
        } catch (error) {
            next(error);
        }
    }

    public async getLearnerBadges(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { learnerId } = req.params;
            const badges = await this.badgeRepo.findByLearnerId(learnerId);
            res.status(200).json(badges);
        } catch (error) {
            next(error);
        }
    }
}
