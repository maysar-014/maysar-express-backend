import { Metric } from '../entities/Metric.entity';

export interface IMetricRepository {
    save(metric: Metric): Promise<void>;
    findByPeriod(type: string, dimension: string, start: Date, end: Date): Promise<Metric[]>;
    getLatest(type: string, dimension: string): Promise<Metric | null>;
}
