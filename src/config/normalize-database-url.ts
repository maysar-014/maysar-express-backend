const applyLocalDatabaseDefaults = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  try {
    const parsed = new URL(databaseUrl);
    const isLocalHost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0';

    if (process.env.NODE_ENV !== 'production' && isLocalHost) {
      if (!parsed.searchParams.has('sslmode')) {
        parsed.searchParams.set('sslmode', 'disable');
        process.env.DATABASE_URL = parsed.toString();
      }

      if (!process.env.PGSSLMODE) {
        process.env.PGSSLMODE = 'disable';
      }
    }
  } catch {
    // If parsing fails, keep original env untouched.
  }
};

applyLocalDatabaseDefaults();
