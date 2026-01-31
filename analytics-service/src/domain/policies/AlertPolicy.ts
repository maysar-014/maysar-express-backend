import { Metric } from '../entities/Metric.entity';
import { AlertSeverity } from '../entities/Alert.entity';

export interface AlertRule {
    metricType: string;
    threshold: number;
    condition: 'above' | 'below';
    severity: AlertSeverity;
}

export class AlertPolicy {
    private rules: AlertRule[] = [];

    constructor(rules: AlertRule[] = []) {
        this.rules = rules;
    }

    shouldTriggerAlert(metric: Metric): { trigger: boolean; rule?: AlertRule } {
        const rule = this.rules.find(r => r.metricType === metric.type);
        if (!rule) return { trigger: false };

        const value = metric.value.toNumber();
        const trigger = rule.condition === 'above'
            ? value > rule.threshold
            : value < rule.threshold;

        return { trigger, rule };
    }

    getTriggeredSeverity(metric: Metric): AlertSeverity | null {
        const { trigger, rule } = this.shouldTriggerAlert(metric);
        return trigger ? rule!.severity : null;
    }
}
