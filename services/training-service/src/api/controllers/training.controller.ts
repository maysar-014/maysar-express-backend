import { NextFunction, Request, Response } from 'express';
import { StartTrainingUseCase } from '../../application/use-cases/start-training.use-case';
import { CompleteTrainingUseCase } from '../../application/use-cases/complete-training.use-case';
import { GetTrainingProgressUseCase } from '../../application/use-cases/get-training-progress.use-case';
import { CheckEligibilityUseCase } from '../../application/use-cases/check-eligibility.use-case';

export class TrainingController {
    constructor(
        private readonly startTrainingUseCase: StartTrainingUseCase,
        private readonly completeTrainingUseCase: CompleteTrainingUseCase,
        private readonly getProgressUseCase: GetTrainingProgressUseCase,
        private readonly checkEligibilityUseCase: CheckEligibilityUseCase
    ) { }

    public async start(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await this.startTrainingUseCase.execute(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    public async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.completeTrainingUseCase.execute({
                trainingRecordId: id,
                ...req.body
            });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    public async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { learnerId } = req.params;
            const result = await this.getProgressUseCase.execute({ learnerId });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    public async checkEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { learnerId } = req.params;
            const result = await this.checkEligibilityUseCase.execute({ learnerId });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}
