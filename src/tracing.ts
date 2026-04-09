import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'maysar-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

const logTracingError = (phase: 'start' | 'shutdown', error: unknown) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.warn(`[Tracing] ${phase} failed: ${message}`);
};

void Promise.resolve(sdk.start()).catch((error) => {
    logTracingError('start', error);
});

const shutdownTracing = () => {
    void Promise.resolve(sdk.shutdown()).catch((error) => {
        logTracingError('shutdown', error);
    });
};

process.on('SIGTERM', shutdownTracing);
process.on('SIGINT', shutdownTracing);
