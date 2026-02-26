import { injectable } from 'inversify';

@injectable()
export class SchedulerService {
    schedule(job: () => Promise<void>, delay: number): void {
        setTimeout(async () => {
            try {
                await job();
            } catch (error) {
                console.error('Scheduled job failed:', error);
            }
        }, delay);
    }
}
