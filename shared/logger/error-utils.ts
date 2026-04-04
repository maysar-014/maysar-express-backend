type LoggableRecord = Record<string, unknown>;

const ERROR_LIKE_KEYS = new Set(['error', 'err', 'cause', 'reason']);

function isRecord(value: unknown): value is LoggableRecord {
    return typeof value === 'object' && value !== null;
}

export function isErrorLike(value: unknown): value is Error | LoggableRecord {
    if (value instanceof Error) {
        return true;
    }

    if (!isRecord(value)) {
        return false;
    }

    return typeof value.message === 'string'
        && (typeof value.stack === 'string' || typeof value.name === 'string');
}

export function serializeError(error: unknown): LoggableRecord {
    if (error instanceof Error) {
        const serialized: LoggableRecord = {
            name: error.name,
            message: error.message
        };

        if (error.stack) {
            serialized.stack = error.stack;
        }

        const anyError = error as Error & LoggableRecord & { cause?: unknown; code?: unknown };

        if (typeof anyError.code !== 'undefined') {
            serialized.code = anyError.code;
        }

        if (typeof anyError.cause !== 'undefined') {
            serialized.cause = serializeLogValue(anyError.cause);
        }

        for (const key of Object.keys(error)) {
            serialized[key] = serializeLogValue((error as unknown as LoggableRecord)[key]);
        }

        return serialized;
    }

    if (typeof error === 'string') {
        return {
            name: 'Error',
            message: error
        };
    }

    if (!isRecord(error)) {
        return {
            name: 'Error',
            message: String(error)
        };
    }

    const serialized: LoggableRecord = {};

    for (const [key, value] of Object.entries(error)) {
        serialized[key] = serializeLogValue(value);
    }

    if (typeof error.name === 'string') {
        serialized.name = error.name;
    }

    if (typeof error.message === 'string') {
        serialized.message = error.message;
    } else if (typeof serialized.message === 'undefined') {
        try {
            serialized.message = JSON.stringify(error);
        } catch {
            serialized.message = '[unserializable error object]';
        }
    }

    if (typeof error.stack === 'string') {
        serialized.stack = error.stack;
    }

    return serialized;
}

export function serializeLogValue(value: unknown): unknown {
    if (value instanceof Error || isErrorLike(value)) {
        return serializeError(value);
    }

    if (Array.isArray(value)) {
        return value.map(item => serializeLogValue(item));
    }

    return value;
}

export function normalizeLogMeta(meta?: LoggableRecord): LoggableRecord | undefined {
    if (!meta) {
        return undefined;
    }

    const normalized: LoggableRecord = {};

    for (const [key, value] of Object.entries(meta)) {
        normalized[key] = ERROR_LIKE_KEYS.has(key)
            ? serializeLogValue(value)
            : value;
    }

    return normalized;
}
