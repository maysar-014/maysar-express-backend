import cron from 'node-cron';

export class SchedulerService {
    constructor() { }

    scheduleTask(name: string, schedule: string, task: () => Promise<void>): void {
        console.log(`Scheduled task ${name} with cron ${schedule}`);
        cron.schedule(schedule, async () => {
            console.log(`Executing task: ${name}`);
            try {
                await task();
            } catch (error) {
                console.error(`Error executing task ${name}:`, error);
            }
        });
    }

    async runBatchProcessing(): Promise<void> {
        console.log('Running scheduled batch processing...');
        // Orchestrate batch aggregation here
        // Example: Aggregating real-time metrics into daily aggregates
    }
}
