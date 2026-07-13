// Sentry error + performance reporting.
//
// The DSN is read from EXPO_PUBLIC_SENTRY_DSN, which Metro inlines into the JS
// bundle at build/serve time. If the DSN is absent (e.g. a local run that
// hasn't set it), initSentry() is a no-op — nothing breaks and no events are
// sent — so the app is safe to run before Sentry is fully provisioned.
//
// Call initSentry() once at module load in the root layout, and wrap the root
// component with Sentry.wrap so navigation + render errors are captured.
import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    // Capture a slice of transactions for performance; tune once we see real
    // traffic. Errors are always captured regardless of this rate.
    tracesSampleRate: 0.2,
    // Recruiter emails / candidate data shouldn't be auto-attached.
    sendDefaultPii: false,
  });
}

export { Sentry };
