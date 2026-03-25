import { RegisterEnablerUseCase } from '../use-cases/register-enabler.use-case';
import { ApproveEnablerUseCase } from '../use-cases/approve-enabler.use-case';

export class EnablerOnboardingSaga {
    constructor(
        private readonly registerUseCase: RegisterEnablerUseCase,
        private readonly approveUseCase: ApproveEnablerUseCase,
        private readonly verificationService: any,
        private readonly walletService: any,
        private readonly notificationService: any
    ) { }

    async execute(registrationData: any): Promise<void> {
        try {
            // 1. Register Enabler (Profile Creation)
            const enabler = await this.registerUseCase.execute(registrationData);

            // 2. Business Verification (Async check)
            const verificationResult = await this.verificationService.verifyBusiness({
                taxId: registrationData.taxId,
                businessLicense: registrationData.businessLicense
            });

            if (!verificationResult.isValid) {
                await this.notificationService.sendRejection(enabler.userId, verificationResult.reason);
                // Should update entity status to Rejected here
                return;
            }

            // 3. Auto-Approval (if eligible)
            if (enabler.tier === 'BRONZE') {
                const completenessEvents = Array.isArray(registrationData.completenessEvents) &&
                    registrationData.completenessEvents.length > 0
                    ? registrationData.completenessEvents
                    : ['registration_submitted', 'business_verified'];

                await this.approveUseCase.execute(
                    enabler.id,
                    'SYSTEM_AUTO_APPROVE',
                    completenessEvents
                );
            }

            // 4. Setup Wallet
            await this.walletService.createWallet(enabler.userId, 'ENABLER');

            // 5. Welcome Notification
            await this.notificationService.sendWelcomeEmail(enabler.userId);

        } catch (error) {
            console.error('Enabler Onboarding Saga Failed:', error);
            // Implement compensation logic or retry mechanism
            throw error;
        }
    }
}
