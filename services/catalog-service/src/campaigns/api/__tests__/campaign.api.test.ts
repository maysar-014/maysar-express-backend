import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import { Container } from 'inversify';
import { TYPES } from '../../types';
import { CampaignController } from '../controllers/campaign.controller';

jest.mock('../middleware', () => ({
    authenticate: () => (req: any, _res: any, next: any) => {
        req.user = { userId: 'seller-1', role: 'seller' };
        next();
    },
    authorize: () => (_req: any, _res: any, next: any) => next(),
    validateRequest: () => (_req: any, _res: any, next: any) => next()
}));

describe('Campaign API', () => {
    let app: express.Application;
    let mockCreateUseCase: any;

    beforeEach(() => {
        const container = new Container();

        mockCreateUseCase = {
            execute: jest.fn().mockResolvedValue({ success: true, id: 'campaign-123' })
        };

        container.bind(CampaignController).to(CampaignController);
        container.bind(TYPES.CreateCampaignUseCase).toConstantValue(mockCreateUseCase);
        // Bind other mocks as needed...
        container.bind(TYPES.GetCampaignUseCase).toConstantValue({ execute: jest.fn() });
        container.bind(TYPES.ListCampaignsUseCase).toConstantValue({ execute: jest.fn() });
        container.bind(TYPES.UpdateCampaignUseCase).toConstantValue({ execute: jest.fn() });
        container.bind(TYPES.LaunchCampaignUseCase).toConstantValue({ execute: jest.fn() });
        container.bind(TYPES.PauseCampaignUseCase).toConstantValue({ execute: jest.fn() });
        container.bind(TYPES.ResumeCampaignUseCase).toConstantValue({ execute: jest.fn() });
        container.bind(TYPES.CancelCampaignUseCase).toConstantValue({ execute: jest.fn() });
        container.bind(TYPES.CompleteCampaignUseCase).toConstantValue({ execute: jest.fn() });

        const server = new InversifyExpressServer(container);
        app = server.build();
    });

    it('POST /campaigns should return 201', async () => {
        const response = await request(app)
            .post('/campaigns')
            .send({
                name: 'Test Campaign',
                type: 'percentage_discount',
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                pricingRules: []
            });

        // Current mock implementation returns 201 but we might need to handle auth
        // Since we mocked authorize to allow all in some dev flows
        expect(response.status).toBe(201);
    });
});
