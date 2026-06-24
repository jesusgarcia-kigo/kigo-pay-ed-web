/**
 * Configuración centralizada de la aplicación.
 * Lee variables de entorno (Vite expone las que tienen prefijo VITE_).
 * En mock mode, usa valores por defecto para prototipar sin backend.
 */

export const config = {
  env: import.meta.env.VITE_APP_ENV ?? "development",
  isMockMode: import.meta.env.VITE_ENABLE_MOCK_MODE === "true",

  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api",
    timeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 10000),
  },

  session: {
    paramKey: import.meta.env.VITE_SESSION_PARAM_KEY ?? "session",
  },

  payments: {
    provider: (import.meta.env.VITE_PAYMENT_PROVIDER ?? "stripe") as
      | "stripe"
      | "mercadopago"
      | "paypal",
    stripe: {
      publishableKey:
        import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ??
        "pk_test_MOCK_1234567890abcdef",
    },
    mercadopago: {
      publicKey:
        import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ??
        "TEST-0000-0000-0000-000000000000",
    },
    paypal: {
      clientId:
        import.meta.env.VITE_PAYPAL_CLIENT_ID ??
        "sb-mock-client-id-1234567890",
    },
  },

  analytics: {
    enabled: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
    gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID ?? "",
    sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? "",
  },
} as const;

export type AppConfig = typeof config;
