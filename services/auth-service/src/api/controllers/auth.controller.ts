import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';

export class AuthController {
  constructor(private readonly registerUserUseCase: RegisterUserUseCase) { }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, role, profile } = req.body;
      const userId = await this.registerUserUseCase.execute({ email, role, profile });
      res.json({ success: true, userId });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
