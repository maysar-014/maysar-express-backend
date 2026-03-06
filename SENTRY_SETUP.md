# Sentry Setup Guide

## Quick Setup Steps:

1. Copy .env.example to .env:
   ```bash
   cp .env.example .env
   ```

2. Add your Sentry DSN to .env:
   ```
   SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
   ```

3. Install dependencies (if not already done):
   ```bash
   npm install
   ```

4. Start your application:
   ```bash
   npm run dev
   ```

5. Test Sentry integration by visiting:
   - Monolith: http://localhost:3000/debug-sentry
   - Payment Service: http://localhost:3001/debug-sentry

6. Check your Sentry dashboard - you should see the test error appear within seconds!

## Getting Your Sentry DSN:

1. Go to https://sentry.io
2. Login to your account
3. Navigate to: **Settings** → **Projects** → **node-express**
4. Click **Client Keys (DSN)** in the left sidebar
5. Copy the DSN value
6. Paste it into your .env file

### Your Project Details:
- Project ID: `4510974607097936`
- Platform: Express
- Slug: `node-express`

### DSN Format:
```
https://[public-key]@o4510974599888896.ingest.de.sentry.io/4510974607097936
```

## Production Setup:

For production, store SENTRY_DSN in your secrets manager (AWS Secrets Manager, OCI Vault, etc.)
and inject it as an environment variable.

## Features Enabled:

✅ Error tracking
✅ Performance monitoring (tracesSampleRate: 1.0)
✅ Request context capture
✅ User IP tracking (sendDefaultPii: true)
✅ Environment tagging (development/production)
✅ Stack traces with source maps

## Sentry Dashboard:

After setup, visit your Sentry dashboard to:
- View errors in real-time
- Set up alerts (email, Slack, PagerDuty)
- Create custom filters and search
- Track error frequency and trends
- View performance metrics
