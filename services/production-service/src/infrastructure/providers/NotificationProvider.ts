
export class NotificationProvider {
    async sendAlert(userId: string, message: string): Promise<void> {
        console.log(`[NotificationProvider] Sending alert to ${userId}: ${message}`);
    }
}
