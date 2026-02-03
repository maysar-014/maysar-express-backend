import { ExpireCertificationsUseCase } from '../../application/use-cases/expire-certifications.use-case';

export class CertificationExpirationJob {
    constructor(private readonly expireCertificationsUseCase: ExpireCertificationsUseCase) { }

    public async run(): Promise<void> {
        console.log('Running certification expiration check...');
        await this.expireCertificationsUseCase.execute();
    }
}
