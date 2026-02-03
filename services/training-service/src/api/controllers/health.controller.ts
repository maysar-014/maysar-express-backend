import { Request, Response } from 'express';

export class HealthController {
    public async check(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            status: 'UP',
            timestamp: new Date().toISOString()
        });
    }
}
