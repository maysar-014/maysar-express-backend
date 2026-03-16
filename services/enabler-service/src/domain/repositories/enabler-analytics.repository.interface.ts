export interface IEnablerAnalyticsRepository {
  upsertInitial(enablerId: string): Promise<void>;
}
