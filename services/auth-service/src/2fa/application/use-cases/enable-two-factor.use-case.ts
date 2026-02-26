export class EnableTwoFactorUseCase {
    constructor(
        private readonly repository: any,
        private readonly totpService: any
    ) {}

    async execute(dto: { userId: string }) {
        const user = await this.repository.findById(dto.userId);
        if (!user) throw new Error('User not found');
        if (user.twoFactorEnabled) throw new Error('Two-factor already enabled');

        const { secret } = this.totpService.generateSecret();
        const qrCode = await this.totpService.generateQRCode(secret);
        
        user.twoFactorSecret = secret;
        await this.repository.update(user);
        return { qrCode };
    }
}
