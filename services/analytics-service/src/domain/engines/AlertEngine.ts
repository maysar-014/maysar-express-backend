import { AlertPolicy, AlertRule } from '../policies/AlertPolicy';
import { Metric } from '../entities/Metric.entity';
import { Alert } from '../entities/Alert.entity';

export class AlertEngine {
    private policy: AlertPolicy;

    constructor(rules: AlertRule[] = []) {
        this.policy = new AlertPolicy(rules);
    }

    async processMetric(metric: Metric): Promise<Alert | null> {
        const { trigger, rule } = this.policy.shouldTriggerAlert(metric);

        if (!trigger || !rule) return null;

        return new Alert({
            id: `alt_${Date.now()}`,
            type: rule.metricType as any,
            severity: rule.severity,
            message: `${metric.type} is ${rule.condition} threshold: ${metric.value.toNumber()} ${rule.condition} ${rule.threshold}`,
            metric: metric.type,
            value: metric.value.toNumber(),
            threshold: rule.threshold,
            timestamp: new Date(),
            actions: ['notify_admin'] // Default action
        });
    }
}
