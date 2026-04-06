type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

const DEFAULT_LOCAL_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3100',
    'http://localhost:3200',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3100',
    'http://127.0.0.1:3200'
];

const TRUSTED_DOMAIN_PATTERN = /^https?:\/\/([a-z0-9-]+\.)*maysar\.co\.tz(?::\d+)?$/i;

const normalizeOrigin = (value: string): string => value.trim().replace(/\/$/, '');

const parseOriginList = (value: string | undefined): string[] => {
    if (!value) return [];
    return value
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean);
};

export const getTrustedCorsOrigins = (extraOrigins: string[] = []): string[] => {
    const envOrigins = [
        ...parseOriginList(process.env.CORS_ORIGIN),
        ...parseOriginList(process.env.FRONTEND_URL),
        ...parseOriginList(process.env.PLATFORM_BASE_URL)
    ];

    return Array.from(new Set([
        ...envOrigins,
        ...extraOrigins.map(normalizeOrigin),
        ...DEFAULT_LOCAL_ORIGINS
    ].filter(Boolean)));
};

export const isTrustedCorsOrigin = (origin: string, allowedOrigins: string[] = []): boolean => {
    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.includes(normalizedOrigin)) {
        return true;
    }

    try {
        const parsed = new URL(normalizedOrigin);
        const hostname = parsed.hostname.toLowerCase();

        if (
            hostname === 'localhost'
            || hostname === '127.0.0.1'
            || hostname.endsWith('.localhost')
        ) {
            return true;
        }

        if (hostname === 'maysar.co.tz' || hostname.endsWith('.maysar.co.tz')) {
            return true;
        }
    } catch {
        return false;
    }

    return TRUSTED_DOMAIN_PATTERN.test(normalizedOrigin);
};

export const createTrustedCorsOriginDelegate = (extraOrigins: string[] = []) => {
    const allowedOrigins = getTrustedCorsOrigins(extraOrigins);

    return (origin: string | undefined, callback: CorsOriginCallback): void => {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (isTrustedCorsOrigin(origin, allowedOrigins)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`));
    };
};

export const createTrustedCorsOptions = (extraOrigins: string[] = []) => ({
    origin: createTrustedCorsOriginDelegate(extraOrigins),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Request-ID',
        'X-CSRF-Token',
        'X-Contract-Test',
        'X-User-Id',
        'X-User-Email',
        'X-User-Roles',
        'X-Service-Key'
    ],
    optionsSuccessStatus: 200
});
