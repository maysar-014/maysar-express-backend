import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPost, httpPut, request, response, requestParam, requestBody } from 'inversify-express-utils';
import { TYPES } from '../../types';
import { CreateCampaignUseCase } from '../../application/use-cases/create-campaign.use-case';
import { GetCampaignUseCase } from '../../application/use-cases/get-campaign.use-case';
import { ListCampaignsUseCase } from '../../application/use-cases/list-campaigns.use-case';
import { UpdateCampaignUseCase } from '../../application/use-cases/update-campaign.use-case';
import { LaunchCampaignUseCase } from '../../application/use-cases/launch-campaign.use-case';
import { PauseCampaignUseCase } from '../../application/use-cases/pause-campaign.use-case';
import { ResumeCampaignUseCase } from '../../application/use-cases/resume-campaign.use-case';
import { CancelCampaignUseCase } from '../../application/use-cases/cancel-campaign.use-case';
import { CompleteCampaignUseCase } from '../../application/use-cases/complete-campaign.use-case';
import { CreateCampaignDto } from '../../application/dto/create-campaign.dto';
import { authenticate, authorize, validateRequest } from '../middleware';
import { CreateCampaignSchema, UpdateCampaignSchema } from '../validators/campaign.validator';

@controller('/campaigns', authenticate())
export class CampaignController {
    constructor(
        @inject(TYPES.CreateCampaignUseCase) private createCampaign: CreateCampaignUseCase,
        @inject(TYPES.GetCampaignUseCase) private getCampaign: GetCampaignUseCase,
        @inject(TYPES.ListCampaignsUseCase) private listCampaignsUseCase: ListCampaignsUseCase,
        @inject(TYPES.UpdateCampaignUseCase) private updateCampaignUseCase: UpdateCampaignUseCase,
        @inject(TYPES.LaunchCampaignUseCase) private launchCampaignUseCase: LaunchCampaignUseCase,
        @inject(TYPES.PauseCampaignUseCase) private pauseCampaignUseCase: PauseCampaignUseCase,
        @inject(TYPES.ResumeCampaignUseCase) private resumeCampaignUseCase: ResumeCampaignUseCase,
        @inject(TYPES.CancelCampaignUseCase) private cancelCampaignUseCase: CancelCampaignUseCase,
        @inject(TYPES.CompleteCampaignUseCase) private completeCampaignUseCase: CompleteCampaignUseCase
    ) { }

    @httpPost('/', authorize(['seller', 'admin']), validateRequest(CreateCampaignSchema))
    async create(@requestBody() body: CreateCampaignDto, @request() req: Request, @response() res: Response) {
        try {
            const sellerId = (req as any).user?.id || 'anonymous';
            const userId = (req as any).user?.id || 'anonymous';
            const result = await this.createCampaign.execute(sellerId, userId, body);
            return res.status(201).json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    @httpGet('/')
    async list(@request() req: Request, @response() res: Response) {
        try {
            const result = await this.listCampaignsUseCase.execute(req.query);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    @httpGet('/:id')
    async get(@requestParam('id') id: string, @response() res: Response) {
        try {
            const result = await this.getCampaign.execute(id);
            return res.json(result);
        } catch (error: any) {
            return res.status(404).json({ error: error.message });
        }
    }

    @httpPut('/:id', authorize(['seller', 'admin']), validateRequest(UpdateCampaignSchema))
    async update(@requestParam('id') id: string, @requestBody() body: any, @response() res: Response) {
        try {
            const result = await this.updateCampaignUseCase.execute(id, body);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    @httpPost('/:id/launch', authorize(['seller', 'admin']))
    async launch(@requestParam('id') id: string, @response() res: Response) {
        try {
            const result = await this.launchCampaignUseCase.execute(id);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    @httpPost('/:id/pause', authorize(['seller', 'admin']))
    async pause(@requestParam('id') id: string, @response() res: Response) {
        try {
            const result = await this.pauseCampaignUseCase.execute(id);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    @httpPost('/:id/resume', authorize(['seller', 'admin']))
    async resume(@requestParam('id') id: string, @response() res: Response) {
        try {
            const result = await this.resumeCampaignUseCase.execute(id);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    @httpPost('/:id/cancel', authorize(['seller', 'admin']))
    async cancel(@requestParam('id') id: string, @response() res: Response) {
        try {
            const result = await this.cancelCampaignUseCase.execute(id);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    @httpPost('/:id/complete', authorize(['admin']))
    async complete(@requestParam('id') id: string, @response() res: Response) {
        try {
            const result = await this.completeCampaignUseCase.execute(id);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}
