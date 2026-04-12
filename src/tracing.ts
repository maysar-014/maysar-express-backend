import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'maysar-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
    }),
    instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
    ],
});

const logTracingError = (phase: 'start' | 'shutdown', error: unknown) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.warn(`[Tracing] ${phase} failed: ${message}`);
};

try {
    sdk.start();
} catch (error) {
    logTracingError('start', error);
}

const shutdownTracing = () => {
    void sdk.shutdown().catch((error) => {
        logTracingError('shutdown', error);
    });
};

process.on('SIGTERM', shutdownTracing);
process.on('SIGINT', shutdownTracing);
