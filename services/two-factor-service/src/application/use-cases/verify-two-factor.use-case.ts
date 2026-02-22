export class VerifyTwoFactorUseCase {
    constructor(
        private readonly repository: any,
        private readonly totpService: any
    ) {}

    async execute(dto: { userId: string; code: string }) {
        const user = await this.repository.findById(dto.userId);
        if (!user) throw new Error('User not found');

        const valid = this.totpService.verify(user.twoFactorSecret, dto.code);
        return { valid };
    }
}
