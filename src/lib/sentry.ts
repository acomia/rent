import * as Sentry from '@sentry/react-native';

import { env } from '@/lib/env';

/**
 * Initialize Sentry error monitoring. No-op when no DSN is configured
 * (e.g. local dev), so the app still boots without a Sentry account.
 */
export function initSentry() {
  if (!env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    // Keep tracing modest until we know our volume; tune later.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
  });
}

export { Sentry };
