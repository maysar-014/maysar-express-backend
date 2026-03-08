import prisma from '../database/prisma';
import { Metric } from '../../domain/entities/Metric.entity';
import { MetricMapper } from '../../application/mappers/metric.mapper';
import { IMetricRepository } from '../../domain/interfaces/IMetricRepository';
import { Analytics_Metric } from '@prisma/client';

export class MetricRepository implements IMetricRepository {
    async save(metric: Metric): Promise<void> {
        const data = MetricMapper.toDto(metric);
        await prisma.analytics_Metric.upsert({
            where: { id: data.id },
            update: {
                value: data.value,
                confidence: data.confidence,
                timestamp: new Date(data.timestamp)
            },
            create: {
                id: data.id,
                metricType: data.type,
                value: data.value,
                dimension: data.dimension,
                period: data.period,
                timestamp: new Date(data.timestamp),
                confidence: data.confidence
            }
        });
    }

    async findByPeriod(type: string, dimension: string, start: Date, end: Date): Promise<Metric[]> {
        const records = await prisma.analytics_Metric.findMany({
            where: {
                metricType: type,
                dimension,
                timestamp: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        return records.map((record: Analytics_Metric) => MetricMapper.toEntity({
            id: record.id,
            type: record.metricType,
            value: record.value,
            dimension: record.dimension,
            period: record.period,
            timestamp: record.timestamp.toISOString(),
            confidence: record.confidence
        }));
    }

    async getLatest(type: string, dimension: string): Promise<Metric | null> {
        const record = await prisma.analytics_Metric.findFirst({
            where: {
                metricType: type,
                dimension
            },
            orderBy: {
                timestamp: 'desc'
            }
        });

        if (!record) return null;

        return MetricMapper.toEntity({
            id: record.id,
            type: record.metricType,
            value: record.value,
            dimension: record.dimension,
            period: record.period,
            timestamp: record.timestamp.toISOString(),
            confidence: record.confidence
        });
    }
}
