/**
 * Datos mock para prototipar sin backend.
 * Estos valores simulan las respuestas reales de la API.
 * Cuando VITE_ENABLE_MOCK_MODE=false, estos no se usan.
 */

export const mockSession = {
  valid: true,
  user: {
    id: "usr_001",
    name: "Carlos García",
    email: "carlos@example.com",
    phone: "+5215512345678",
  },
  parking: {
    location: "Plaza Kigo - Nivel 2, Cajón B-14",
    vehicle: "Toyota Corolla 2022 — ABC-123",
    entry_time: "2026-06-23T14:30:00Z",
    duration_minutes: 90,
    amount_due: 45.0,
    currency: "MXN",
  },
};

export const mockPaymentIntent = {
  payment_intent_id: "pi_mock_123456",
  client_secret: "pi_mock_123456_secret_abc",
  status: "requires_payment_method" as const,
};

export const mockPaymentConfirmation = {
  status: "succeeded" as const,
  receipt_url: "https://pay.kigo.app/receipt/pi_mock_123456",
  timestamp: "2026-06-23T16:05:00Z",
};

export const mockPaymentHistory = [
  {
    id: "pay_001",
    amount: 45.0,
    currency: "MXN",
    status: "succeeded",
    location: "Plaza Kigo - Nivel 2",
    date: "2026-06-23T16:05:00Z",
  },
  {
    id: "pay_002",
    amount: 30.0,
    currency: "MXN",
    status: "succeeded",
    location: "Plaza Kigo - Nivel 1",
    date: "2026-06-20T11:30:00Z",
  },
];

// --- Tipos derivados de los mocks ---

export type SessionData = typeof mockSession;
export type UserData = (typeof mockSession)["user"];
export type ParkingData = (typeof mockSession)["parking"];
export type PaymentIntent = typeof mockPaymentIntent;
export type PaymentConfirmation = typeof mockPaymentConfirmation;
export type PaymentHistoryItem = (typeof mockPaymentHistory)[number];
