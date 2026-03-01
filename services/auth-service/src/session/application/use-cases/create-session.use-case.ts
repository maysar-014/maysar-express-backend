import { SessionEngine } from '../../../domain/engines/session.engine';

export class CreateSessionUseCase {
  constructor(private readonly sessionEngine: SessionEngine) { }

  async execute(input: { userId: string; role: string; deviceInfo: string; ipAddress: string }): Promise<string> {
    return this.sessionEngine.createSession(input.userId, input.role, input.deviceInfo, input.ipAddress);
  }
}

